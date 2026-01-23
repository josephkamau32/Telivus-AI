"""
Digital Twin Service

Core service for managing personalized AI health avatars that learn
continuously from user interactions.
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from sqlalchemy.orm import selectinload

from app.models.digital_twin import (
    DigitalTwin, HealthEvent, LearnedPattern, ProactiveAlert,
    TwinInsight, TwinLearningLog
)
from app.models.health import HealthAssessmentRequest

logger = logging.getLogger(__name__)


class DigitalTwinService:
    """
    Service for managing digital twin operations.
    
    Handles creation, updates, learning, and querying of AI health avatars.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_or_create_twin(self, user_id: str) -> DigitalTwin:
        """
        Get existing digital twin or create a new one for the user.
        
        Args:
            user_id: User ID
            
        Returns:
            DigitalTwin instance
        """
        try:
            # Try to find existing twin
            result = await self.session.execute(
                select(DigitalTwin).where(DigitalTwin.user_id == user_id)
            )
            twin = result.scalar_one_or_none()
            
            if twin:
                logger.info(f"Found existing twin for user {user_id}")
                return twin
            
            # Create new twin
            twin = DigitalTwin(
                id=f"twin_{uuid.uuid4().hex}",
                user_id=user_id,
                twin_name=f"Health Twin",
                learning_level="beginner",
                data_points_count=0,
                interaction_count=0,
                accuracy_score=0.0,
                prediction_accuracy=0.0,
                confidence_level=0.0
            )
            
            self.session.add(twin)
            await self.session.commit()
            await self.session.refresh(twin)
            
            logger.info(f"Created new twin for user {user_id}: {twin.id}")
            return twin
            
        except Exception as e:
            logger.error(f"Error getting/creating twin for user {user_id}: {e}")
            await self.session.rollback()
            raise
    
    async def get_twin_by_id(self, twin_id: str) -> Optional[DigitalTwin]:
        """Get digital twin by ID."""
        try:
            result = await self.session.execute(
                select(DigitalTwin).where(DigitalTwin.id == twin_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting twin {twin_id}: {e}")
            return None
    
    async def update_twin(
        self,
        twin_id: str,
        **updates
    ) -> Optional[DigitalTwin]:
        """
        Update digital twin attributes.
        
        Args:
            twin_id: Digital twin ID
            **updates: Fields to update
            
        Returns:
            Updated DigitalTwin or None
        """
        try:
            twin = await self.get_twin_by_id(twin_id)
            if not twin:
                return None
            
            for key, value in updates.items():
                if hasattr(twin, key):
                    setattr(twin, key, value)
            
            twin.updated_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(twin)
            
            logger.info(f"Updated twin {twin_id}")
            return twin
            
        except Exception as e:
            logger.error(f"Error updating twin {twin_id}: {e}")
            await self.session.rollback()
            return None
    
    async def record_health_event(
        self,
        twin_id: str,
        event_type: str,
        event_data: Dict[str, Any],
        event_date: Optional[datetime] = None
    ) -> Optional[HealthEvent]:
        """
        Record a health event for the digital twin.
        
        Args:
            twin_id: Digital twin ID
            event_type: Type of event (assessment, symptom, vital_sign, etc.)
            event_data: Event data dictionary
            event_date: When the event occurred (defaults to now)
            
        Returns:
            Created HealthEvent or None
        """
        try:
            event = HealthEvent(
                id=f"event_{uuid.uuid4().hex}",
                twin_id=twin_id,
                event_type=event_type,
                event_category=event_data.get("category"),
                event_date=event_date or datetime.utcnow(),
                symptoms=event_data.get("symptoms"),
                vital_signs=event_data.get("vital_signs"),
                interventions=event_data.get("interventions"),
                outcomes=event_data.get("outcomes"),
                severity=event_data.get("severity"),
                feeling_state=event_data.get("feeling_state"),
                data_quality=event_data.get("data_quality", 1.0),
                source=event_data.get("source", "user_input"),
                extra_data=event_data.get("metadata", {})
            )
            
            self.session.add(event)
            
            # Update twin data points count
            twin = await self.get_twin_by_id(twin_id)
            if twin:
                twin.data_points_count += 1
                twin.interaction_count += 1
                twin.last_learning_update = datetime.utcnow()
            
            await self.session.commit()
            await self.session.refresh(event)
            
            logger.info(f"Recorded health event for twin {twin_id}: {event.id}")
            return event
            
        except Exception as e:
            logger.error(f"Error recording health event for twin {twin_id}: {e}")
            await self.session.rollback()
            return None
    
    async def get_timeline(
        self,
        twin_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[HealthEvent]:
        """
        Get health timeline for a digital twin.
        
        Args:
            twin_id: Digital twin ID
            limit: Maximum number of events to return
            offset: Offset for pagination
            
        Returns:
            List of HealthEvents ordered by date (newest first)
        """
        try:
            result = await self.session.execute(
                select(HealthEvent)
                .where(HealthEvent.twin_id == twin_id)
                .order_by(desc(HealthEvent.event_date))
                .limit(limit)
                .offset(offset)
            )
            events = result.scalars().all()
            return list(events)
            
        except Exception as e:
            logger.error(f"Error getting timeline for twin {twin_id}: {e}")
            return []
    
    async def discover_pattern(
        self,
        twin_id: str,
        cause: str,
        effect: str,
        confidence: float,
        evidence_count: int,
        pattern_data: Dict[str, Any]
    ) -> Optional[LearnedPattern]:
        """
        Record a newly discovered pattern for the digital twin.
        
        Args:
            twin_id: Digital twin ID
            cause: What causes the effect
            effect: What is affected
            confidence: Confidence score (0-100)
            evidence_count: Number of times observed
            pattern_data: Additional pattern information
            
        Returns:
            Created LearnedPattern or None
        """
        try:
            pattern = LearnedPattern(
                id=f"pattern_{uuid.uuid4().hex}",
                twin_id=twin_id,
                pattern_type=pattern_data.get("pattern_type", "correlation"),
                category=pattern_data.get("category"),
                cause=cause,
                effect=effect,
                confidence_score=confidence,
                evidence_count=evidence_count,
                statistical_significance=pattern_data.get("p_value"),
                effect_strength=pattern_data.get("effect_strength"),
                effect_direction=pattern_data.get("effect_direction", "negative"),
                time_lag=pattern_data.get("time_lag"),
                seasonality=pattern_data.get("seasonality"),
                is_validated=confidence >= 85.0,
                extra_data=pattern_data.get("metadata", {}),
                supporting_data=pattern_data.get("supporting_data"),
                last_confirmed_at=datetime.utcnow()
            )
            
            self.session.add(pattern)
            await self.session.commit()
            await self.session.refresh(pattern)
            
            # Update twin learning level based on patterns
            await self._update_learning_level(twin_id)
            
            logger.info(f"Discovered pattern for twin {twin_id}: {pattern.id}")
            return pattern
            
        except Exception as e:
            logger.error(f"Error discovering pattern for twin {twin_id}: {e}")
            await self.session.rollback()
            return None
    
    async def get_learned_patterns(
        self,
        twin_id: str,
        min_confidence: float = 0.0,
        is_active: bool = True
    ) -> List[LearnedPattern]:
        """
        Get all learned patterns for a digital twin.
        
        Args:
            twin_id: Digital twin ID
            min_confidence: Minimum confidence threshold
            is_active: Filter by active status
            
        Returns:
            List of LearnedPatterns
        """
        try:
            query = select(LearnedPattern).where(
                and_(
                    LearnedPattern.twin_id == twin_id,
                    LearnedPattern.confidence_score >= min_confidence,
                    LearnedPattern.is_active == is_active
                )
            ).order_by(desc(LearnedPattern.confidence_score))
            
            result = await self.session.execute(query)
            patterns = result.scalars().all()
            return list(patterns)
            
        except Exception as e:
            logger.error(f"Error getting patterns for twin {twin_id}: {e}")
            return []
    
    async def create_proactive_alert(
        self,
        twin_id: str,
        alert_data: Dict[str, Any]
    ) -> Optional[ProactiveAlert]:
        """
        Create a proactive health alert for the user.
        
        Args:
            twin_id: Digital twin ID
            alert_data: Alert information
            
        Returns:
            Created ProactiveAlert or None
        """
        try:
            alert = ProactiveAlert(
                id=f"alert_{uuid.uuid4().hex}",
                twin_id=twin_id,
                alert_type=alert_data["alert_type"],
                severity=alert_data.get("severity", "medium"),
                category=alert_data.get("category"),
                title=alert_data["title"],
                description=alert_data["description"],
                predicted_condition=alert_data.get("predicted_condition"),
                predicted_likelihood=alert_data.get("predicted_likelihood"),
                predicted_timeframe=alert_data.get("predicted_timeframe"),
                confidence_score=alert_data.get("confidence_score", 0.0),
                reasoning=alert_data.get("reasoning"),
                contributing_factors=alert_data.get("contributing_factors"),
                similar_cases_count=alert_data.get("similar_cases_count", 0),
                recommended_actions=alert_data.get("recommended_actions", []),
                intervention_suggestions=alert_data.get("intervention_suggestions", []),
                expires_at=datetime.utcnow() + timedelta(days=7),
                extra_data=alert_data.get("metadata", {})
            )
            
            self.session.add(alert)
            await self.session.commit()
            await self.session.refresh(alert)
            
            logger.info(f"Created proactive alert for twin {twin_id}: {alert.id}")
            return alert
            
        except Exception as e:
            logger.error(f"Error creating alert for twin {twin_id}: {e}")
            await self.session.rollback()
            return None
    
    async def get_active_alerts(
        self,
        twin_id: str,
        severity: Optional[str] = None
    ) -> List[ProactiveAlert]:
        """Get active alerts for a digital twin."""
        try:
            query = select(ProactiveAlert).where(
                and_(
                    ProactiveAlert.twin_id == twin_id,
                    ProactiveAlert.status == "active",
                    ProactiveAlert.expires_at > datetime.utcnow()
                )
            )
            
            if severity:
                query = query.where(ProactiveAlert.severity == severity)
            
            query = query.order_by(desc(ProactiveAlert.triggered_at))
            
            result = await self.session.execute(query)
            alerts = result.scalars().all()
            return list(alerts)
            
        except Exception as e:
            logger.error(f"Error getting alerts for twin {twin_id}: {e}")
            return []
    
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert."""
        try:
            result = await self.session.execute(
                select(ProactiveAlert).where(ProactiveAlert.id == alert_id)
            )
            alert = result.scalar_one_or_none()
            
            if alert:
                alert.status = "acknowledged"
                alert.acknowledged_at = datetime.utcnow()
                await self.session.commit()
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error acknowledging alert {alert_id}: {e}")
            await self.session.rollback()
            return False
    
    async def create_insight(
        self,
        twin_id: str,
        insight_data: Dict[str, Any]
    ) -> Optional[TwinInsight]:
        """Create a new insight for the digital twin."""
        try:
            insight = TwinInsight(
                id=f"insight_{uuid.uuid4().hex}",
                twin_id=twin_id,
                insight_type=insight_data["insight_type"],
                category=insight_data.get("category"),
                title=insight_data["title"],
                description=insight_data["description"],
                confidence_level=insight_data.get("confidence_level", 0.0),
                evidence_strength=insight_data.get("evidence_strength", "moderate"),
                data_points_used=insight_data.get("data_points_used", 0),
                health_impact=insight_data.get("health_impact", "neutral"),
                impact_score=insight_data.get("impact_score"),
                is_actionable=insight_data.get("is_actionable", False),
                suggested_actions=insight_data.get("suggested_actions"),
                is_highlighted=insight_data.get("is_highlighted", False),
                priority=insight_data.get("priority", 5),
                extra_data=insight_data.get("metadata", {})
            )
            
            self.session.add(insight)
            await self.session.commit()
            await self.session.refresh(insight)
            
            logger.info(f"Created insight for twin {twin_id}: {insight.id}")
            return insight
            
        except Exception as e:
            logger.error(f"Error creating insight for twin {twin_id}: {e}")
            await self.session.rollback()
            return None
    
    async def get_insights(
        self,
        twin_id: str,
        is_highlighted: Optional[bool] = None,
        limit: int = 10
    ) -> List[TwinInsight]:
        """Get insights for a digital twin."""
        try:
            query = select(TwinInsight).where(
                and_(
                    TwinInsight.twin_id == twin_id,
                    TwinInsight.is_active == True
                )
            )
            
            if is_highlighted is not None:
                query = query.where(TwinInsight.is_highlighted == is_highlighted)
            
            query = query.order_by(
                desc(TwinInsight.priority),
                desc(TwinInsight.discovered_at)
            ).limit(limit)
            
            result = await self.session.execute(query)
            insights = result.scalars().all()
            return list(insights)
            
        except Exception as e:
            logger.error(f"Error getting insights for twin {twin_id}: {e}")
            return []
    
    async def log_learning_event(
        self,
        twin_id: str,
        learning_type: str,
        description: str,
        metrics_before: Dict[str, Any],
        metrics_after: Dict[str, Any],
        success: bool = True
    ) -> Optional[TwinLearningLog]:
        """Log a learning event for audit trail."""
        try:
            log = TwinLearningLog(
                id=f"log_{uuid.uuid4().hex}",
                twin_id=twin_id,
                learning_type=learning_type,
                description=description,
                metrics_before=metrics_before,
                metrics_after=metrics_after,
                improvement_delta=metrics_after.get("accuracy", 0) - metrics_before.get("accuracy", 0),
                success=success
            )
            
            self.session.add(log)
            await self.session.commit()
            
            return log
            
        except Exception as e:
            logger.error(f"Error logging learning event for twin {twin_id}: {e}")
            await self.session.rollback()
            return None
    
    async def _update_learning_level(self, twin_id: str):
        """Update the twin's learning level based on accumulated knowledge."""
        try:
            twin = await self.get_twin_by_id(twin_id)
            if not twin:
                return
            
            # Count patterns
            pattern_count = await self.session.execute(
                select(func.count(LearnedPattern.id)).where(
                    and_(
                        LearnedPattern.twin_id == twin_id,
                        LearnedPattern.is_active == True
                    )
                )
            )
            num_patterns = pattern_count.scalar()
            
            # Determine learning level
            if num_patterns >= 20:
                level = "expert"
                confidence = 90.0
            elif num_patterns >= 10:
                level = "advanced"
                confidence = 75.0
            elif num_patterns >= 5:
                level = "intermediate"
                confidence = 60.0
            else:
                level = "beginner"
                confidence = 40.0
            
            # Update twin
            twin.learning_level = level
            twin.confidence_level = min(confidence, 95.0)
            twin.accuracy_score = min(confidence + (twin.data_points_count * 0.1), 95.0)
            
            await self.session.commit()
            
        except Exception as e:
            logger.error(f"Error updating learning level for twin {twin_id}: {e}")
            await self.session.rollback()
    
    async def get_twin_stats(self, twin_id: str) -> Dict[str, Any]:
        """Get comprehensive stats for a digital twin."""
        try:
            twin = await self.get_twin_by_id(twin_id)
            if not twin:
                return {}
            
            # Count patterns
            pattern_count = await self.session.execute(
                select(func.count(LearnedPattern.id)).where(
                    LearnedPattern.twin_id == twin_id
                )
            )
            
            # Count active alerts
            alert_count = await self.session.execute(
                select(func.count(ProactiveAlert.id)).where(
                    and_(
                        ProactiveAlert.twin_id == twin_id,
                        ProactiveAlert.status == "active"
                    )
                )
            )
            
            # Count insights
            insight_count = await self.session.execute(
                select(func.count(TwinInsight.id)).where(
                    TwinInsight.twin_id == twin_id
                )
            )
            
            return {
                "twin_id": twin.id,
                "twin_name": twin.twin_name,
                "learning_level": twin.learning_level,
                "data_points": twin.data_points_count,
                "interactions": twin.interaction_count,
                "accuracy_score": twin.accuracy_score,
                "confidence_level": twin.confidence_level,
                "patterns_learned": pattern_count.scalar(),
                "active_alerts": alert_count.scalar(),
                "insights_generated": insight_count.scalar(),
                "twin_age_days": (datetime.utcnow() - twin.created_at).days,
                "last_updated": twin.last_learning_update.isoformat() if twin.last_learning_update else None
            }
            
        except Exception as e:
            logger.error(f"Error getting stats for twin {twin_id}: {e}")
            return {}
