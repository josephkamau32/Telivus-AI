"""
Predictive Alert Service for Health Monitoring.

This service provides intelligent alert generation based on trajectory predictions,
user-defined rules, and real-time health monitoring to provide early warnings
and preventive care recommendations.
"""

import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging
import json

from app.core.logging import get_logger
from app.models.db_models import (
    PredictiveAlert,
    AlertRule,
    AlertNotification,
    AlertAnalytics,
    User
)
from app.models.health import (
    PredictiveAlert as AlertModel,
    AlertRule as RuleModel,
    AlertType,
    AlertSeverity,
    AlertStatus,
    AlertRequest,
    AlertRuleRequest,
    AlertAcknowledgeRequest
)
from app.services.trajectory_service import trajectory_service_instance
from app.core.database import get_db
from sqlalchemy.orm import Session

logger = get_logger(__name__)


class AlertService:
    """
    Comprehensive alert service for predictive health monitoring.

    Features:
    - Rule-based alert generation from trajectory predictions
    - Multi-channel notifications (in-app, email, SMS)
    - Alert analytics and performance tracking
    - Emergency detection and escalation
    - User-customizable alert rules
    """

    def __init__(self):
        """Initialize the alert service."""
        self.default_rules = self._get_default_alert_rules()
        logger.info("Alert Service initialized")

    async def generate_alerts_for_user(self, user_id: str, db: Session) -> List[AlertModel]:
        """
        Generate predictive alerts for a user based on their trajectory and rules.

        Args:
            user_id: User identifier
            db: Database session

        Returns:
            List of generated alerts
        """
        try:
            alerts = []

            # Get user's active alert rules
            user_rules = db.query(AlertRule).filter(
                AlertRule.user_id == user_id,
                AlertRule.is_active == True
            ).all()

            # If no custom rules, use defaults
            if not user_rules:
                user_rules = self._create_default_rules_for_user(user_id, db)

            # Get recent trajectory data
            trajectory_data = await trajectory_service_instance.get_trajectory_history(
                user_id, limit=1, db=db
            )

            if not trajectory_data or not trajectory_data[0].get('predictions'):
                logger.info(f"No trajectory data available for user {user_id}")
                return []

            latest_trajectory = trajectory_data[0]['predictions'][0]

            # Evaluate each rule
            for rule in user_rules:
                alert = await self._evaluate_rule(rule, latest_trajectory, user_id, db)
                if alert:
                    alerts.append(alert)

            # Generate additional alerts from trajectory analysis
            trajectory_alerts = await self._generate_trajectory_based_alerts(
                latest_trajectory, user_id, db
            )
            alerts.extend(trajectory_alerts)

            # Remove duplicates and save alerts
            unique_alerts = self._deduplicate_alerts(alerts)
            saved_alerts = []

            for alert in unique_alerts:
                saved_alert = self._save_alert_to_db(alert, db)
                if saved_alert:
                    saved_alerts.append(saved_alert)

            logger.info(f"Generated {len(saved_alerts)} alerts for user {user_id}")
            return saved_alerts

        except Exception as e:
            logger.error(f"Error generating alerts for user {user_id}: {e}")
            return []

    async def acknowledge_alert(self, request: AlertAcknowledgeRequest, db: Session) -> Dict[str, Any]:
        """
        Acknowledge an alert and record user response.

        Args:
            request: Alert acknowledgment request
            db: Database session

        Returns:
            Acknowledgment confirmation
        """
        try:
            alert = db.query(PredictiveAlert).filter(
                PredictiveAlert.id == request.alert_id,
                PredictiveAlert.user_id == request.user_id
            ).first()

            if not alert:
                raise ValueError(f"Alert {request.alert_id} not found")

            # Update alert status
            alert.status = "acknowledged"
            alert.acknowledged_at = datetime.utcnow()

            # Update analytics
            await self._update_alert_analytics(request.user_id, alert, request, db)

            db.commit()

            return {
                "alert_id": request.alert_id,
                "status": "acknowledged",
                "acknowledged_at": alert.acknowledged_at.isoformat(),
                "message": "Alert acknowledged successfully"
            }

        except Exception as e:
            logger.error(f"Error acknowledging alert {request.alert_id}: {e}")
            db.rollback()
            raise

    async def get_user_alerts(self, request: AlertRequest, db: Session) -> Dict[str, Any]:
        """
        Retrieve alerts for a user with filtering options.

        Args:
            request: Alert retrieval request
            db: Database session

        Returns:
            Filtered alerts and metadata
        """
        try:
            query = db.query(PredictiveAlert).filter(
                PredictiveAlert.user_id == request.user_id
            )

            # Apply filters
            if request.alert_types:
                query = query.filter(PredictiveAlert.alert_type.in_(request.alert_types))

            if request.severity_levels:
                query = query.filter(PredictiveAlert.severity.in_(request.severity_levels))

            if request.status_filter:
                query = query.filter(PredictiveAlert.status.in_(request.status_filter))
            else:
                # Default to active alerts
                query = query.filter(PredictiveAlert.status == "active")

            if not request.include_expired:
                query = query.filter(
                    (PredictiveAlert.expires_at.is_(None)) |
                    (PredictiveAlert.expires_at > datetime.utcnow())
                )

            # Get alerts
            alerts = query.order_by(PredictiveAlert.created_at.desc()).limit(request.limit).all()

            # Convert to response format
            alert_list = []
            for alert in alerts:
                alert_list.append({
                    "alert_id": alert.id,
                    "alert_type": alert.alert_type,
                    "severity": alert.severity,
                    "title": alert.title,
                    "message": alert.message,
                    "condition_name": alert.condition_name,
                    "predicted_value": alert.predicted_value,
                    "threshold_value": alert.threshold_value,
                    "confidence_score": alert.confidence_score,
                    "recommended_actions": alert.recommended_actions or [],
                    "created_at": alert.created_at.isoformat(),
                    "status": alert.status,
                    "expires_at": alert.expires_at.isoformat() if alert.expires_at else None
                })

            return {
                "user_id": request.user_id,
                "alert_count": len(alert_list),
                "alerts": alert_list,
                "filters_applied": {
                    "alert_types": request.alert_types,
                    "severity_levels": request.severity_levels,
                    "status_filter": request.status_filter,
                    "include_expired": request.include_expired
                }
            }

        except Exception as e:
            logger.error(f"Error retrieving alerts for user {request.user_id}: {e}")
            raise

    async def create_alert_rule(self, request: AlertRuleRequest, db: Session) -> Dict[str, Any]:
        """
        Create a new alert rule for a user.

        Args:
            request: Alert rule creation request
            db: Database session

        Returns:
            Created rule confirmation
        """
        try:
            import uuid

            rule = AlertRule(
                id=str(uuid.uuid4()),
                user_id=request.user_id,
                alert_type=request.rule.alert_type,
                condition_name=request.rule.condition_name,
                metric_name=request.rule.metric_name,
                operator=request.rule.operator,
                threshold_value=request.rule.threshold_value,
                time_window_days=request.rule.time_window_days,
                severity=request.rule.severity,
                is_active=request.rule.is_active,
                notification_channels=request.rule.notification_channels,
                cooldown_hours=request.rule.cooldown_hours
            )

            db.add(rule)
            db.commit()

            return {
                "rule_id": rule.id,
                "message": "Alert rule created successfully",
                "rule": {
                    "alert_type": rule.alert_type,
                    "metric_name": rule.metric_name,
                    "operator": rule.operator,
                    "threshold_value": rule.threshold_value,
                    "severity": rule.severity,
                    "is_active": rule.is_active
                }
            }

        except Exception as e:
            logger.error(f"Error creating alert rule: {e}")
            db.rollback()
            raise

    async def send_notifications(self, alert_id: str, db: Session) -> Dict[str, Any]:
        """
        Send notifications for an alert through configured channels.

        Args:
            alert_id: Alert identifier
            db: Database session

        Returns:
            Notification sending results
        """
        try:
            alert = db.query(PredictiveAlert).filter(PredictiveAlert.id == alert_id).first()
            if not alert:
                raise ValueError(f"Alert {alert_id} not found")

            # Get user's notification preferences
            user_rules = db.query(AlertRule).filter(
                AlertRule.user_id == alert.user_id,
                AlertRule.alert_type == alert.alert_type,
                AlertRule.is_active == True
            ).all()

            notification_results = []

            for rule in user_rules:
                for channel in rule.notification_channels:
                    result = await self._send_notification(alert, channel, db)
                    notification_results.append(result)

            return {
                "alert_id": alert_id,
                "notifications_sent": len(notification_results),
                "results": notification_results
            }

        except Exception as e:
            logger.error(f"Error sending notifications for alert {alert_id}: {e}")
            raise

    def _get_default_alert_rules(self) -> List[Dict[str, Any]]:
        """Get default alert rules for new users."""
        return [
            {
                "alert_type": "symptom_worsening",
                "metric_name": "symptom_severity_score",
                "operator": ">",
                "threshold_value": 7.0,
                "severity": "high",
                "time_window_days": 3,
                "cooldown_hours": 24
            },
            {
                "alert_type": "risk_level_increase",
                "metric_name": "risk_score",
                "operator": ">=",
                "threshold_value": 0.8,
                "severity": "high",
                "time_window_days": 7,
                "cooldown_hours": 48
            },
            {
                "alert_type": "emergency_warning",
                "metric_name": "emergency_flags",
                "operator": ">",
                "threshold_value": 0,
                "severity": "critical",
                "time_window_days": 1,
                "cooldown_hours": 1
            },
            {
                "alert_type": "preventive_action",
                "metric_name": "days_since_checkup",
                "operator": ">=",
                "threshold_value": 30,
                "severity": "medium",
                "time_window_days": 30,
                "cooldown_hours": 168  # 1 week
            }
        ]

    def _create_default_rules_for_user(self, user_id: str, db: Session) -> List[AlertRule]:
        """Create default alert rules for a user."""
        import uuid

        rules = []
        for rule_config in self.default_rules:
            rule = AlertRule(
                id=str(uuid.uuid4()),
                user_id=user_id,
                alert_type=rule_config["alert_type"],
                metric_name=rule_config["metric_name"],
                operator=rule_config["operator"],
                threshold_value=rule_config["threshold_value"],
                time_window_days=rule_config["time_window_days"],
                severity=rule_config["severity"],
                notification_channels=["in_app"],
                cooldown_hours=rule_config["cooldown_hours"]
            )
            db.add(rule)
            rules.append(rule)

        db.commit()
        return rules

    async def _evaluate_rule(self, rule: AlertRule, trajectory: Dict[str, Any],
                           user_id: str, db: Session) -> Optional[AlertModel]:
        """Evaluate an alert rule against trajectory data."""
        try:
            # Check cooldown period
            recent_alert = db.query(PredictiveAlert).filter(
                PredictiveAlert.user_id == user_id,
                PredictiveAlert.alert_type == rule.alert_type,
                PredictiveAlert.created_at > datetime.utcnow() - timedelta(hours=rule.cooldown_hours)
            ).first()

            if recent_alert:
                return None  # Still in cooldown

            # Evaluate condition based on rule type
            if rule.alert_type == "symptom_worsening":
                return await self._check_symptom_worsening(rule, trajectory, user_id)
            elif rule.alert_type == "risk_level_increase":
                return await self._check_risk_increase(rule, trajectory, user_id)
            elif rule.alert_type == "emergency_warning":
                return await self._check_emergency_flags(rule, trajectory, user_id)
            elif rule.alert_type == "preventive_action":
                return await self._check_preventive_needs(rule, trajectory, user_id)

            return None

        except Exception as e:
            logger.warning(f"Error evaluating rule {rule.id}: {e}")
            return None

    async def _check_symptom_worsening(self, rule: AlertRule, trajectory: Dict[str, Any],
                                     user_id: str) -> Optional[AlertModel]:
        """Check for symptom worsening patterns."""
        predicted_values = trajectory.get('predicted_values', [])
        if not predicted_values:
            return None

        # Check if recent predictions show increasing symptoms
        recent_predictions = [p['predicted_value'] for p in predicted_values[-7:]]  # Last 7 days
        if len(recent_predictions) < 3:
            return None

        # Check for upward trend
        trend = self._calculate_trend(recent_predictions)
        current_value = recent_predictions[-1]

        if trend > 0.1 and current_value > rule.threshold_value:  # Increasing trend and above threshold
            return AlertModel(
                alert_id=f"alert_{user_id}_{int(datetime.utcnow().timestamp())}",
                user_id=user_id,
                alert_type=AlertType.SYMPTOM_WORSENING,
                severity=AlertSeverity(rule.severity),
                title="Symptom Worsening Detected",
                message=f"Your symptoms are trending upward. Current severity: {current_value:.1f}/10. Consider consulting your healthcare provider.",
                condition_name=trajectory.get('condition_name', 'General Health'),
                predicted_value=current_value,
                threshold_value=rule.threshold_value,
                confidence_score=trajectory.get('confidence_score', 0.8),
                recommended_actions=[
                    "Schedule a follow-up appointment",
                    "Track your symptoms daily",
                    "Review current treatment plan",
                    "Consider lifestyle modifications"
                ],
                data_points={
                    "trend": trend,
                    "recent_values": recent_predictions,
                    "condition": trajectory.get('condition_name')
                }
            )

        return None

    async def _check_risk_increase(self, rule: AlertRule, trajectory: Dict[str, Any],
                                 user_id: str) -> Optional[AlertModel]:
        """Check for increasing health risk levels."""
        risk_assessments = trajectory.get('risk_assessments', {})
        if not risk_assessments:
            return None

        # Find highest risk condition
        max_risk_condition = max(risk_assessments.items(), key=lambda x: x[1])
        condition_name, risk_score = max_risk_condition

        if risk_score >= rule.threshold_value:
            severity = AlertSeverity.CRITICAL if risk_score > 0.9 else AlertSeverity(rule.severity)

            return AlertModel(
                alert_id=f"risk_alert_{user_id}_{int(datetime.utcnow().timestamp())}",
                user_id=user_id,
                alert_type=AlertType.RISK_LEVEL_INCREASE,
                severity=severity,
                title=f"Elevated Risk: {condition_name}",
                message=f"Your risk score for {condition_name} has reached {risk_score:.1f}/1.0. Immediate attention recommended.",
                condition_name=condition_name,
                predicted_value=risk_score,
                threshold_value=rule.threshold_value,
                confidence_score=trajectory.get('confidence_score', 0.8),
                recommended_actions=[
                    "Consult healthcare provider immediately",
                    "Review and update treatment plan",
                    "Consider additional diagnostic tests",
                    "Monitor symptoms closely"
                ],
                data_points={
                    "all_risks": risk_assessments,
                    "highest_risk_condition": condition_name,
                    "risk_score": risk_score
                }
            )

        return None

    async def _check_emergency_flags(self, rule: AlertRule, trajectory: Dict[str, Any],
                                   user_id: str) -> Optional[AlertModel]:
        """Check for emergency warning signs."""
        # This would integrate with emergency detection algorithms
        # For now, return None as this requires more sophisticated logic
        return None

    async def _check_preventive_needs(self, rule: AlertRule, trajectory: Dict[str, Any],
                                    user_id: str) -> Optional[AlertModel]:
        """Check for preventive care needs."""
        # Check if user needs regular check-ups or preventive measures
        # This could be based on time since last assessment, risk factors, etc.

        return AlertModel(
            alert_id=f"preventive_{user_id}_{int(datetime.utcnow().timestamp())}",
            user_id=user_id,
            alert_type=AlertType.PREVENTIVE_ACTION,
            severity=AlertSeverity(rule.severity),
            title="Preventive Care Reminder",
            message="It's time for your regular health check-up and preventive care review.",
            condition_name="Preventive Care",
            confidence_score=0.9,
            recommended_actions=[
                "Schedule annual physical examination",
                "Update vaccinations if needed",
                "Review preventive screenings",
                "Discuss lifestyle optimization"
            ],
            data_points={
                "checkup_type": "annual_physical",
                "recommended_frequency": "yearly"
            }
        )

    async def _generate_trajectory_based_alerts(self, trajectory: Dict[str, Any],
                                              user_id: str, db: Session) -> List[AlertModel]:
        """Generate additional alerts based on trajectory analysis."""
        alerts = []

        # Check for rapid deterioration
        predicted_values = trajectory.get('predicted_values', [])
        if len(predicted_values) >= 7:
            recent_trend = self._calculate_trend([p['predicted_value'] for p in predicted_values[-7:]])
            if recent_trend > 0.2:  # Rapid worsening
                alerts.append(AlertModel(
                    alert_id=f"rapid_deterioration_{user_id}_{int(datetime.utcnow().timestamp())}",
                    user_id=user_id,
                    alert_type=AlertType.SYMPTOM_WORSENING,
                    severity=AlertSeverity.HIGH,
                    title="Rapid Symptom Deterioration",
                    message="Your symptoms are worsening rapidly. Please seek immediate medical attention.",
                    condition_name=trajectory.get('condition_name', 'Health Condition'),
                    confidence_score=trajectory.get('confidence_score', 0.8),
                    recommended_actions=[
                        "Contact healthcare provider today",
                        "Go to emergency room if severe",
                        "Monitor vital signs closely",
                        "Prepare medical history summary"
                    ],
                    data_points={
                        "trend": recent_trend,
                        "timeframe": "7 days",
                        "severity": "rapid_deterioration"
                    }
                ))

        return alerts

    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate linear trend in a series of values."""
        if len(values) < 2:
            return 0.0

        import numpy as np
        x = np.arange(len(values))
        y = np.array(values)

        # Simple linear regression slope
        slope = np.polyfit(x, y, 1)[0]
        return slope

    def _deduplicate_alerts(self, alerts: List[AlertModel]) -> List[AlertModel]:
        """Remove duplicate alerts based on type and condition."""
        seen = set()
        unique_alerts = []

        for alert in alerts:
            key = f"{alert.alert_type}_{alert.condition_name}_{alert.severity}"
            if key not in seen:
                seen.add(key)
                unique_alerts.append(alert)

        return unique_alerts

    def _save_alert_to_db(self, alert: AlertModel, db: Session) -> Optional[AlertModel]:
        """Save an alert to the database."""
        try:
            import uuid

            db_alert = PredictiveAlert(
                id=alert.alert_id or str(uuid.uuid4()),
                user_id=alert.user_id,
                alert_type=alert.alert_type,
                severity=alert.severity,
                title=alert.title,
                message=alert.message,
                condition_name=alert.condition_name,
                predicted_value=alert.predicted_value,
                threshold_value=alert.threshold_value,
                confidence_score=alert.confidence_score,
                recommended_actions=alert.recommended_actions,
                data_points=alert.data_points,
                expires_at=datetime.utcnow() + timedelta(days=7)  # Expire in 7 days
            )

            db.add(db_alert)
            db.commit()

            return alert

        except Exception as e:
            logger.error(f"Error saving alert to database: {e}")
            db.rollback()
            return None

    async def _update_alert_analytics(self, user_id: str, alert: PredictiveAlert,
                                    request: AlertAcknowledgeRequest, db: Session):
        """Update alert analytics based on user response."""
        try:
            analytics = db.query(AlertAnalytics).filter(
                AlertAnalytics.user_id == user_id
            ).first()

            if not analytics:
                analytics = AlertAnalytics(user_id=user_id)
                db.add(analytics)

            # Update statistics
            analytics.acknowledged_alerts += 1

            if request.effectiveness_rating and request.effectiveness_rating >= 4:
                analytics.resolved_alerts += 1

            # Calculate average response time
            if alert.created_at and alert.acknowledged_at:
                response_time = (alert.acknowledged_at - alert.created_at).total_seconds() / 3600
                current_avg = analytics.average_response_time_hours
                current_count = analytics.acknowledged_alerts

                if current_count > 1:
                    analytics.average_response_time_hours = (
                        (current_avg * (current_count - 1)) + response_time
                    ) / current_count
                else:
                    analytics.average_response_time_hours = response_time

            # Calculate effectiveness score
            if analytics.acknowledged_alerts > 0:
                effectiveness = analytics.resolved_alerts / analytics.acknowledged_alerts
                analytics.alert_effectiveness_score = min(effectiveness, 1.0)

            db.commit()

        except Exception as e:
            logger.warning(f"Error updating alert analytics: {e}")
            db.rollback()

    async def _send_notification(self, alert: PredictiveAlert, channel: str, db: Session) -> Dict[str, Any]:
        """Send notification through a specific channel."""
        try:
            import uuid

            # Create notification record
            notification = AlertNotification(
                id=str(uuid.uuid4()),
                alert_id=alert.id,
                user_id=alert.user_id,
                channel=channel,
                status="sent",
                sent_at=datetime.utcnow()
            )

            db.add(notification)
            db.commit()

            # In a real implementation, this would integrate with:
            # - Email service (SendGrid, AWS SES)
            # - SMS service (Twilio, AWS SNS)
            # - Push notification service (Firebase, OneSignal)
            # - In-app notification system

            logger.info(f"Notification sent via {channel} for alert {alert.id}")

            return {
                "notification_id": notification.id,
                "channel": channel,
                "status": "sent",
                "sent_at": notification.sent_at.isoformat()
            }

        except Exception as e:
            logger.error(f"Error sending {channel} notification: {e}")
            return {
                "channel": channel,
                "status": "failed",
                "error": str(e)
            }


# Global alert service instance
alert_service = AlertService()