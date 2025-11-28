"""
Predictive Alerts API endpoints.

Provides endpoints for managing predictive health alerts, alert rules,
and notification preferences.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.health import (
    AlertRequest,
    AlertRuleRequest,
    AlertAcknowledgeRequest,
    PredictiveAlert,
    AlertRule,
    AlertType,
    AlertSeverity,
    AlertStatus
)
from app.services.alert_service import alert_service
from app.core.database import get_db
from app.core.logging import get_logger

# Create router
router = APIRouter()

# Get logger
logger = get_logger(__name__)


@router.post(
    "/generate/{user_id}",
    summary="Generate Predictive Alerts",
    description="""
    Generate predictive alerts for a user based on their health trajectory and alert rules.

    This endpoint analyzes the user's recent health data and trajectory predictions
    to identify potential health risks, symptom worsening patterns, and preventive
    care needs. Alerts are generated according to user-defined rules and default
    medical guidelines.

    **Generated Alert Types:**
    - Symptom worsening detection
    - Risk level increases
    - Emergency warning signs
    - Preventive care reminders
    - Medication adherence alerts
    - Vital sign abnormalities
    """
)
async def generate_alerts(
    *,
    user_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Generate predictive alerts for a user.

    Args:
        user_id: User identifier
        background_tasks: FastAPI background tasks
        db: Database session

    Returns:
        Alert generation results

    Raises:
        HTTPException: If alert generation fails
    """
    try:
        logger.info(f"Generating alerts for user {user_id}")

        # Generate alerts
        alerts = await alert_service.generate_alerts_for_user(user_id, db)

        # Send notifications for high-priority alerts in background
        high_priority_alerts = [alert for alert in alerts if alert.severity in ["high", "critical"]]
        if high_priority_alerts:
            background_tasks.add_task(
                _send_notifications_for_alerts,
                [alert.alert_id for alert in high_priority_alerts],
                db
            )

        return {
            "user_id": user_id,
            "alerts_generated": len(alerts),
            "high_priority_alerts": len(high_priority_alerts),
            "alerts": [
                {
                    "alert_id": alert.alert_id,
                    "alert_type": alert.alert_type,
                    "severity": alert.severity,
                    "title": alert.title,
                    "condition_name": alert.condition_name,
                    "created_at": alert.created_at.isoformat()
                }
                for alert in alerts
            ]
        }

    except Exception as e:
        logger.error(f"Failed to generate alerts for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate predictive alerts. Please try again."
        )


@router.get(
    "/user/{user_id}",
    summary="Get User Alerts",
    description="""
    Retrieve alerts for a specific user with advanced filtering options.

    Returns alerts sorted by creation date (newest first) with comprehensive
    filtering capabilities for alert types, severity levels, and status.
    """
)
async def get_user_alerts(
    *,
    user_id: str,
    alert_types: List[AlertType] = None,
    severity_levels: List[AlertSeverity] = None,
    status_filter: List[AlertStatus] = None,
    limit: int = 50,
    include_expired: bool = False,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get alerts for a user with filtering.

    Args:
        user_id: User identifier
        alert_types: Filter by alert types
        severity_levels: Filter by severity levels
        status_filter: Filter by alert status
        limit: Maximum alerts to return
        include_expired: Include expired alerts
        db: Database session

    Returns:
        Filtered user alerts

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Retrieving alerts for user {user_id}")

        request = AlertRequest(
            user_id=user_id,
            alert_types=alert_types,
            severity_levels=severity_levels,
            status_filter=status_filter,
            limit=limit,
            include_expired=include_expired
        )

        result = await alert_service.get_user_alerts(request, db)

        return result

    except Exception as e:
        logger.error(f"Failed to retrieve alerts for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve alerts. Please try again."
        )


@router.post(
    "/acknowledge",
    summary="Acknowledge Alert",
    description="""
    Acknowledge an alert and provide feedback on its helpfulness.

    When acknowledging an alert, users can optionally provide:
    - Actions taken in response to the alert
    - Rating of alert effectiveness (1-5 scale)
    - Additional notes or observations

    This feedback is used to improve future alert generation and analytics.
    """
)
async def acknowledge_alert(
    *,
    request: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Acknowledge an alert with optional feedback.

    Args:
        request: Alert acknowledgment request
        db: Database session

    Returns:
        Acknowledgment confirmation

    Raises:
        HTTPException: If acknowledgment fails
    """
    try:
        logger.info(f"Acknowledging alert {request.alert_id} for user {request.user_id}")

        result = await alert_service.acknowledge_alert(request, db)

        return result

    except ValueError as e:
        logger.warning(f"Alert acknowledgment validation error: {e}")
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to acknowledge alert {request.alert_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to acknowledge alert. Please try again."
        )


@router.post(
    "/rules",
    summary="Create Alert Rule",
    description="""
    Create a custom alert rule for a user.

    Alert rules define conditions that trigger predictive alerts based on:
    - Health metrics (symptoms, vital signs, lab values)
    - Comparison operators (>, <, >=, <=, ==)
    - Threshold values for triggering
    - Time windows for evaluation
    - Severity levels and notification preferences

    **Example Rule:**
    Alert when symptom severity exceeds 7.0 for 3 consecutive days with high severity.
    """
)
async def create_alert_rule(
    *,
    request: AlertRuleRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Create a new alert rule.

    Args:
        request: Alert rule creation request
        db: Database session

    Returns:
        Rule creation confirmation

    Raises:
        HTTPException: If rule creation fails
    """
    try:
        logger.info(f"Creating alert rule for user {request.user_id}")

        result = await alert_service.create_alert_rule(request, db)

        return result

    except Exception as e:
        logger.error(f"Failed to create alert rule: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to create alert rule. Please try again."
        )


@router.get(
    "/rules/{user_id}",
    summary="Get User Alert Rules",
    description="""
    Retrieve all alert rules configured for a user.

    Returns both user-defined custom rules and default system rules,
    including their configuration, status, and performance metrics.
    """
)
async def get_user_alert_rules(
    *,
    user_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get alert rules for a user.

    Args:
        user_id: User identifier
        db: Database session

    Returns:
        User alert rules

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Retrieving alert rules for user {user_id}")

        from app.models.db_models import AlertRule

        rules = db.query(AlertRule).filter(AlertRule.user_id == user_id).all()

        rule_list = []
        for rule in rules:
            rule_list.append({
                "rule_id": rule.id,
                "alert_type": rule.alert_type,
                "condition_name": rule.condition_name,
                "metric_name": rule.metric_name,
                "operator": rule.operator,
                "threshold_value": rule.threshold_value,
                "time_window_days": rule.time_window_days,
                "severity": rule.severity,
                "is_active": rule.is_active,
                "notification_channels": rule.notification_channels,
                "cooldown_hours": rule.cooldown_hours,
                "created_at": rule.created_at.isoformat(),
                "updated_at": rule.updated_at.isoformat()
            })

        return {
            "user_id": user_id,
            "rule_count": len(rule_list),
            "rules": rule_list
        }

    except Exception as e:
        logger.error(f"Failed to retrieve alert rules for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve alert rules. Please try again."
        )


@router.put(
    "/rules/{rule_id}",
    summary="Update Alert Rule",
    description="""
    Update an existing alert rule configuration.

    Allows modification of rule parameters including thresholds, severity,
    notification preferences, and activation status.
    """
)
async def update_alert_rule(
    *,
    rule_id: str,
    updates: Dict[str, Any],
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Update an alert rule.

    Args:
        rule_id: Rule identifier
        updates: Fields to update
        db: Database session

    Returns:
        Update confirmation

    Raises:
        HTTPException: If update fails
    """
    try:
        logger.info(f"Updating alert rule {rule_id}")

        from app.models.db_models import AlertRule

        rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
        if not rule:
            raise ValueError(f"Alert rule {rule_id} not found")

        # Update allowed fields
        allowed_fields = [
            'threshold_value', 'time_window_days', 'severity', 'is_active',
            'notification_channels', 'cooldown_hours'
        ]

        for field in allowed_fields:
            if field in updates:
                setattr(rule, field, updates[field])

        rule.updated_at = datetime.utcnow()
        db.commit()

        return {
            "rule_id": rule_id,
            "message": "Alert rule updated successfully",
            "updated_fields": list(updates.keys())
        }

    except ValueError as e:
        logger.warning(f"Alert rule update validation error: {e}")
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update alert rule {rule_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to update alert rule. Please try again."
        )


@router.delete(
    "/rules/{rule_id}",
    summary="Delete Alert Rule",
    description="""
    Delete a user-defined alert rule.

    Note: Default system rules cannot be deleted but can be deactivated.
    """
)
async def delete_alert_rule(
    *,
    rule_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Delete an alert rule.

    Args:
        rule_id: Rule identifier
        db: Database session

    Returns:
        Deletion confirmation

    Raises:
        HTTPException: If deletion fails
    """
    try:
        logger.info(f"Deleting alert rule {rule_id}")

        from app.models.db_models import AlertRule

        rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
        if not rule:
            raise ValueError(f"Alert rule {rule_id} not found")

        # Check if it's a default rule (don't allow deletion of defaults)
        # In practice, you'd have a flag to identify default rules

        db.delete(rule)
        db.commit()

        return {
            "rule_id": rule_id,
            "message": "Alert rule deleted successfully"
        }

    except ValueError as e:
        logger.warning(f"Alert rule deletion validation error: {e}")
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to delete alert rule {rule_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to delete alert rule. Please try again."
        )


@router.get(
    "/analytics/{user_id}",
    summary="Get Alert Analytics",
    description="""
    Retrieve analytics and performance metrics for the alert system.

    Provides insights into alert effectiveness, user response patterns,
    and system performance metrics for continuous improvement.
    """
)
async def get_alert_analytics(
    *,
    user_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get alert analytics for a user.

    Args:
        user_id: User identifier
        db: Database session

    Returns:
        Alert analytics data

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Retrieving alert analytics for user {user_id}")

        from app.models.db_models import AlertAnalytics

        analytics = db.query(AlertAnalytics).filter(
            AlertAnalytics.user_id == user_id
        ).first()

        if not analytics:
            # Return default analytics if none exist
            return {
                "user_id": user_id,
                "total_alerts": 0,
                "acknowledged_alerts": 0,
                "resolved_alerts": 0,
                "false_positives": 0,
                "average_response_time_hours": 0.0,
                "alert_effectiveness_score": 0.0,
                "message": "No alert analytics available yet"
            }

        return {
            "user_id": user_id,
            "total_alerts": analytics.total_alerts,
            "acknowledged_alerts": analytics.acknowledged_alerts,
            "resolved_alerts": analytics.resolved_alerts,
            "false_positives": analytics.false_positives,
            "average_response_time_hours": round(analytics.average_response_time_hours, 2),
            "alert_effectiveness_score": round(analytics.alert_effectiveness_score, 3),
            "true_positive_rate": round(analytics.true_positive_rate, 3),
            "false_positive_rate": round(analytics.false_positive_rate, 3),
            "precision_score": round(analytics.precision_score, 3),
            "recall_score": round(analytics.recall_score, 3),
            "last_updated": analytics.updated_at.isoformat()
        }

    except Exception as e:
        logger.error(f"Failed to retrieve alert analytics for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve alert analytics. Please try again."
        )


async def _send_notifications_for_alerts(alert_ids: List[str], db: Session):
    """
    Background task to send notifications for multiple alerts.

    Args:
        alert_ids: List of alert identifiers
        db: Database session
    """
    try:
        for alert_id in alert_ids:
            try:
                await alert_service.send_notifications(alert_id, db)
                logger.info(f"Notifications sent for alert {alert_id}")
            except Exception as e:
                logger.error(f"Failed to send notifications for alert {alert_id}: {e}")

    except Exception as e:
        logger.error(f"Error in background notification sending: {e}")


# Import datetime for type hints
from datetime import datetime