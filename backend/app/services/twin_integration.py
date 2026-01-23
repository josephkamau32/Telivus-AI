"""
Digital Twin Integration Service

Automatically syncs health assessments with the digital twin for continuous learning.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.db_models import HealthReport, HealthDataPoint
from app.services.twin_service import DigitalTwinService

logger = logging.getLogger(__name__)


class TwinIntegrationService:
    """
    Service for integrating health assessments with digital twin.
    
    Automatically creates health events and triggers learning when
    new assessments are completed.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.twin_service = DigitalTwinService(session)
    
    async def sync_health_report_to_twin(
        self,
        user_id: str,
        health_report: HealthReport
    ) -> bool:
        """
        Sync a health report to the user's digital twin.
        
        Creates a health event from the assessment data.
        
        Args:
            user_id: User ID
            health_report: HealthReport object
            
        Returns:
            bool: True if sync successful
        """
        try:
            # Get or create twin
            twin = await self.twin_service.get_or_create_twin(user_id)
            
            # Extract symptoms from report
            symptoms = health_report.symptoms
            if isinstance(symptoms, list):
                symptoms_dict = {"list": symptoms}
            elif isinstance(symptoms, dict):
                symptoms_dict = symptoms
            else:
                symptoms_dict = {"list": []}
            
            # Determine severity from feeling state
            feeling = health_report.feeling.lower()
            severity_map = {
                "excellent": 1,
                "good": 3,
                "okay": 5,
                "tired": 6,
                "unwell": 7,
                "sick": 8,
                "very sick": 9
            }
            severity = severity_map.get(feeling, 5)
            
            # Create health event
            event_data = {
                "category": "health_assessment",
                "symptoms": symptoms_dict,
                "severity": severity,
                "feeling_state": feeling,
                "source": "health_assessment",
                "metadata": {
                    "report_id": health_report.id,
                    "age": health_report.age,
                    "confidence_score": health_report.confidence_score,
                    "ai_model": health_report.ai_model_used
                }
            }
            
            # Add outcomes if report is completed
            if health_report.status == "completed" and health_report.report_data:
                event_data["outcomes"] = {
                    "assessment_completed": True,
                    "recommendations_provided": True
                }
            
            # Record the event
            event = await self.twin_service.record_health_event(
                twin.id,
                "assessment",
                event_data
            )
            
            if event:
                logger.info(f"Synced health report {health_report.id} to twin {twin.id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error syncing health report to twin: {e}")
            return False
    
    async def sync_health_data_point_to_twin(
        self,
        user_id: str,
        data_point: HealthDataPoint
    ) -> bool:
        """
        Sync a health data point to the user's digital twin.
        
        Args:
            user_id: User ID
            data_point: HealthDataPoint object
            
        Returns:
            bool: True if sync successful
        """
        try:
            twin = await self.twin_service.get_or_create_twin(user_id)
            
            # Extract severity from symptom_severity
            severity = None
            if data_point.symptom_severity:
                if isinstance(data_point.symptom_severity, dict):
                    # Average severity if multiple symptoms
                    severities = [v for v in data_point.symptom_severity.values() if isinstance(v, (int, float))]
                    if severities:
                        severity = int(sum(severities) / len(severities))
            
            event_data = {
                "category": "vital_signs",
                "vital_signs": data_point.vital_signs,
                "symptoms": data_point.symptom_severity,
                "severity": severity,
                "source": data_point.data_source,
                "metadata": {
                    "data_point_id": data_point.id,
                    "confidence_score": data_point.confidence_score,
                    "validated": data_point.is_validated
                }
            }
            
            event = await self.twin_service.record_health_event(
                twin.id,
                "vital_sign",
                event_data,
                event_date=data_point.recorded_at
            )
            
            if event:
                logger.info(f"Synced data point {data_point.id} to twin {twin.id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error syncing data point to twin: {e}")
            return False
    
    async def sync_all_user_health_data(self, user_id: str) -> Dict[str, int]:
        """
        Sync all historical health data for a user to their twin.
        
        This is useful for initializing a twin with existing data.
        
        Args:
            user_id: User ID
            
        Returns:
            dict: Statistics about what was synced
        """
        stats = {
            "reports_synced": 0,
            "data_points_synced": 0,
            "events_created": 0
        }
        
        try:
            # Get all health reports for user
            reports_result = await self.session.execute(
                select(HealthReport)
                .where(HealthReport.user_id == user_id)
                .order_by(HealthReport.created_at)
            )
            reports = reports_result.scalars().all()
            
            # Sync each report
            for report in reports:
                if await self.sync_health_report_to_twin(user_id, report):
                    stats["reports_synced"] += 1
                    stats["events_created"] += 1
            
            # Get all data points for user
            data_points_result = await self.session.execute(
                select(HealthDataPoint)
                .where(HealthDataPoint.user_id == user_id)
                .order_by(HealthDataPoint.recorded_at)
            )
            data_points = data_points_result.scalars().all()
            
            # Sync each data point
            for dp in data_points:
                if await self.sync_health_data_point_to_twin(user_id, dp):
                    stats["data_points_synced"] += 1
                    stats["events_created"] += 1
            
            logger.info(f"Synced all health data for user {user_id}: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error syncing all health data: {e}")
            return stats
    
    async def auto_learn_from_recent_data(
        self,
        user_id: str,
        min_events: int = 5
    ) -> Optional[Dict[str, Any]]:
        """
        Automatically trigger learning if user has enough new data.
        
        Args:
            user_id: User ID
            min_events: Minimum events needed to trigger learning
            
        Returns:
            dict: Learning results or None
        """
        try:
            from app.services.pattern_recognition import PatternRecognitionEngine
            
            twin = await self.twin_service.get_or_create_twin(user_id)
            events = await self.twin_service.get_timeline(twin.id, limit=100)
            
            if len(events) < min_events:
                logger.info(f"Not enough events ({len(events)}) for auto-learning, need {min_events}")
                return None
            
            # Initialize pattern engine
            pattern_engine = PatternRecognitionEngine(min_confidence=0.70, min_evidence=3)
            
            # Discover patterns
            discovered_patterns = pattern_engine.analyze_health_events(events)
            
            # Save patterns
            patterns_saved = 0
            for pattern_data in discovered_patterns:
                pattern = await self.twin_service.discover_pattern(
                    twin.id,
                    pattern_data["cause"],
                    pattern_data["effect"],
                    pattern_data["confidence_score"],
                    pattern_data["evidence_count"],
                    pattern_data
                )
                if pattern:
                    patterns_saved += 1
            
            # Generate insights
            existing_patterns = await self.twin_service.get_learned_patterns(twin.id, min_confidence=70.0)
            insights = pattern_engine.generate_health_insights(events, existing_patterns)
            
            # Save insights
            insights_saved = 0
            for insight_data in insights:
                insight = await self.twin_service.create_insight(twin.id, insight_data)
                if insight:
                    insights_saved += 1
            
            # Generate alerts
            current_context = {
                "time": datetime.utcnow(),
                "feeling": events[0].feeling_state if events else None
            }
            
            risk_predictions = pattern_engine.predict_symptom_risk(
                events,
                existing_patterns,
                current_context
            )
            
            alerts_created = 0
            for prediction in risk_predictions[:3]:  # Top 3 risks
                if prediction["risk_score"] > 60.0:
                    alert_data = {
                        "alert_type": "risk_prediction",
                        "severity": "high" if prediction["risk_score"] > 80 else "medium",
                        "title": f"Risk of {prediction['predicted_condition']}",
                        "description": f"Your twin predicts a {prediction['risk_score']:.0f}% chance of {prediction['predicted_condition']} {prediction['timeframe']}.",
                        "predicted_condition": prediction["predicted_condition"],
                        "predicted_likelihood": prediction["risk_score"],
                        "predicted_timeframe": prediction["timeframe"],
                        "confidence_score": prediction["confidence"],
                        "contributing_factors": prediction["matching_factors"],
                        "reasoning": {"pattern_id": prediction.get("pattern_id")},
                        "recommended_actions": ["Monitor your symptoms", "Consider preventive measures"]
                    }
                    
                    alert = await self.twin_service.create_proactive_alert(twin.id, alert_data)
                    if alert:
                        alerts_created += 1
            
            results = {
                "patterns_discovered": patterns_saved,
                "insights_generated": insights_saved,
                "alerts_created": alerts_created,
                "events_analyzed": len(events)
            }
            
            logger.info(f"Auto-learning completed for twin {twin.id}: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error in auto-learning: {e}")
            return None
