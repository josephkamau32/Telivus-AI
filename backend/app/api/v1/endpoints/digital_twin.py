"""
Digital Twin API Endpoints

RESTful API for managing and interacting with digital health twins.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.services.twin_service import DigitalTwinService
from app.services.pattern_recognition import PatternRecognitionEngine
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/twin", tags=["Digital Twin"])


# Pydantic Models
class TwinResponse(BaseModel):
    """Digital Twin response model."""
    id: str
    user_id: str
    twin_name: str
    learning_level: str
    data_points_count: int
    interaction_count: int
    accuracy_score: float
    confidence_level: float
    twin_age_days: Optional[int] = None
    last_updated: Optional[str] = None
    
    class Config:
        from_attributes = True


class TwinStatsResponse(BaseModel):
    """Twin statistics response."""
    twin_id: str
    twin_name: str
    learning_level: str
    data_points: int
    interactions: int
    accuracy_score: float
    confidence_level: float
    patterns_learned: int
    active_alerts: int
    insights_generated: int
    twin_age_days: int
    last_updated: Optional[str] = None


class HealthEventCreate(BaseModel):
    """Request model for creating health events."""
    event_type: str = Field(..., description="Type of event: assessment, symptom, vital_sign, intervention")
    category: Optional[str] = None
    symptoms: Optional[dict] = None
    vital_signs: Optional[dict] = None
    interventions: Optional[dict] = None
    outcomes: Optional[dict] = None
    severity: Optional[int] = Field(None, ge=0, le=10)
    feeling_state: Optional[str] = None
    source: str = "user_input"


class HealthEventResponse(BaseModel):
    """Health event response model."""
    id: str
    event_type: str
    event_date: datetime
    symptoms: Optional[dict] = None
    severity: Optional[int] = None
    feeling_state: Optional[str] = None
    
    class Config:
        from_attributes = True


class LearnedPatternResponse(BaseModel):
    """Learned pattern response model."""
    id: str
    pattern_type: str
    cause: str
    effect: str
    confidence_score: float
    evidence_count: int
    effect_direction: Optional[str] = None
    discovered_at: datetime
    
    class Config:
        from_attributes = True


class ProactiveAlertResponse(BaseModel):
    """Proactive alert response model."""
    id: str
    alert_type: str
    severity: str
    title: str
    description: str
    confidence_score: float
    predicted_condition: Optional[str] = None
    predicted_likelihood: Optional[float] = None
    recommended_actions: Optional[list] = None
    status: str
    triggered_at: datetime
    
    class Config:
        from_attributes = True


class TwinInsightResponse(BaseModel):
    """Twin insight response model."""
    id: str
    insight_type: str
    title: str
    description: str
    confidence_level: float
    evidence_strength: str
    health_impact: str
    is_actionable: bool
    suggested_actions: Optional[list] = None
    priority: int
    
    class Config:
        from_attributes = True


class TwinUpdateRequest(BaseModel):
    """Request model for updating twin."""
    twin_name: Optional[str] = None
    settings: Optional[dict] = None


# Endpoints
@router.get("/me", response_model=TwinResponse)
async def get_my_twin(
    user_id: str = "demo_user",  # In production, get from auth token
    db: AsyncSession = Depends(get_db)
):
    """
    Get or create the current user's digital twin.
    
    If the twin doesn't exist, it will be created automatically.
    """
    try:
        service = DigitalTwinService(db)
        twin = await service.get_or_create_twin(user_id)
        
        # Calculate twin age
        twin_age = (datetime.utcnow() - twin.created_at).days
        
        return TwinResponse(
            id=twin.id,
            user_id=twin.user_id,
            twin_name=twin.twin_name,
            learning_level=twin.learning_level,
            data_points_count=twin.data_points_count,
            interaction_count=twin.interaction_count,
            accuracy_score=twin.accuracy_score,
            confidence_level=twin.confidence_level,
            twin_age_days=twin_age,
            last_updated=twin.last_learning_update.isoformat() if twin.last_learning_update else None
        )
        
    except Exception as e:
        logger.warning(f"Database unavailable, returning mock twin: {e}")
        # Return mock data when database is not available
        return TwinResponse(
            id="mock_twin_001",
            user_id=user_id,
            twin_name="Health Twin (Demo)",
            learning_level="beginner",
            data_points_count=0,
            interaction_count=0,
            accuracy_score=0.0,
            confidence_level=0.0,
            twin_age_days=0,
            last_updated=None
        )


@router.get("/stats", response_model=TwinStatsResponse)
async def get_twin_stats(
    user_id: str = "demo_user",
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive statistics for the user's digital twin."""
    try:
        service = DigitalTwinService(db)
        twin = await service.get_or_create_twin(user_id)
        stats = await service.get_twin_stats(twin.id)
        
        return TwinStatsResponse(**stats)
        
    except Exception as e:
        logger.warning(f"Database unavailable, returning mock twin stats: {e}")
        # Return mock data when database is not available
        return TwinStatsResponse(
            twin_id="mock_twin_001",
            twin_name="Health Twin (Demo)",
            learning_level="beginner",
            data_points=0,
            interactions=0,
            accuracy_score=0.0,
            confidence_level=0.0,
            patterns_learned=0,
            active_alerts=0,
            insights_generated=0,
            twin_age_days=0,
            last_updated=None
        )


@router.put("/update", response_model=TwinResponse)
async def update_twin(
    request: TwinUpdateRequest,
    user_id: str = "demo_user",
    db: AsyncSession = Depends(get_db)
):
    """Update the user's digital twin settings."""
    try:
        service = DigitalTwinService(db)
        twin = await service.get_or_create_twin(user_id)
        
        updates = {}
        if request.twin_name:
            updates["twin_name"] = request.twin_name
        if request.settings:
            updates["settings"] = request.settings
        
        updated_twin = await service.update_twin(twin.id, **updates)
        
        if not updated_twin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Twin not found"
            )
        
        twin_age = (datetime.utcnow() - updated_twin.created_at).days
        
        return TwinResponse(
            id=updated_twin.id,
            user_id=updated_twin.user_id,
            twin_name=updated_twin.twin_name,
            learning_level=updated_twin.learning_level,
            data_points_count=updated_twin.data_points_count,
            interaction_count=updated_twin.interaction_count,
            accuracy_score=updated_twin.accuracy_score,
            confidence_level=updated_twin.confidence_level,
            twin_age_days=twin_age,
            last_updated=updated_twin.last_learning_update.isoformat() if updated_twin.last_learning_update else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating twin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update twin: {str(e)}"
        )


@router.post("/events", response_model=HealthEventResponse)
async def record_health_event(
    event: HealthEventCreate,
    user_id: str = "demo_user",
    db: AsyncSession = Depends(get_db)
):
    """Record a new health event for the digital twin."""
    try:
        service = DigitalTwinService(db)
        twin = await service.get_or_create_twin(user_id)
        
        event_data = {
            "category": event.category,
            "symptoms": event.symptoms,
            "vital_signs": event.vital_signs,
            "interventions": event.interventions,
            "outcomes": event.outcomes,
            "severity": event.severity,
            "feeling_state": event.feeling_state,
            "source": event.source
        }
        
        created_event = await service.record_health_event(
            twin.id,
            event.event_type,
            event_data
        )
        
        if not created_event:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create health event"
            )
        
        return HealthEventResponse(
            id=created_event.id,
            event_type=created_event.event_type,
            event_date=created_event.event_date,
            symptoms=created_event.symptoms,
            severity=created_event.severity,
            feeling_state=created_event.feeling_state
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording health event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record health event: {str(e)}"
        )


@router.get("/timeline", response_model=List[HealthEventResponse])
async def get_timeline(
    user_id: str = "demo_user",
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get the health timeline for the user's digital twin."""
    try:
        service = DigitalTwinService(db)
        twin = await service.get_or_create_twin(user_id)
        events = await service.get_timeline(twin.id, limit, offset)
        
        return [
            HealthEventResponse(
                id=event.id,
                event_type=event.event_type,
                event_date=event.event_date,
                symptoms=event.symptoms,
                severity=event.severity,
                feeling_state=event.feeling_state
            )
            for event in events
        ]
        
    except Exception as e:
        logger.warning(f"Database unavailable, returning empty timeline: {e}")
        return []  # Return empty list when database is not available


@router.get("/patterns", response_model=List[LearnedPatternResponse])
async def get_learned_patterns(
    user_id: str = "demo_user",
    min_confidence: float = 70.0,
    db: AsyncSession = Depends(get_db)
):
    """Get learned patterns discovered by the digital twin."""
    try:
        service = DigitalTwinService(db)
        twin = await service.get_or_create_twin(user_id)
        patterns = await service.get_learned_patterns(twin.id, min_confidence)
        
        return [
            LearnedPatternResponse(
                id=pattern.id,
                pattern_type=pattern.pattern_type,
                cause=pattern.cause,
                effect=pattern.effect,
                confidence_score=pattern.confidence_score,
                evidence_count=pattern.evidence_count,
                effect_direction=pattern.effect_direction,
                discovered_at=pattern.discovered_at
            )
            for pattern in patterns
        ]
        
    except Exception as e:
        logger.warning(f"Database unavailable, returning empty patterns: {e}")
        return []  # Return empty list when database is not available


@router.get("/alerts", response_model=List[ProactiveAlertResponse])
async def get_proactive_alerts(
    user_id: str = "demo_user",
    severity: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get active proactive alerts for the user."""
    try:
        service = DigitalTwinService(db)
        twin = await service.get_or_create_twin(user_id)
        alerts = await service.get_active_alerts(twin.id, severity)
        
        return [
            ProactiveAlertResponse(
                id=alert.id,
                alert_type=alert.alert_type,
                severity=alert.severity,
                title=alert.title,
                description=alert.description,
                confidence_score=alert.confidence_score,
                predicted_condition=alert.predicted_condition,
                predicted_likelihood=alert.predicted_likelihood,
                recommended_actions=alert.recommended_actions,
                status=alert.status,
                triggered_at=alert.triggered_at
            )
            for alert in alerts
        ]
        
    except Exception as e:
        logger.warning(f"Database unavailable, returning empty alerts: {e}")
        return []  # Return empty list when database is not available


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge a proactive alert."""
    try:
        service = DigitalTwinService(db)
        success = await service.acknowledge_alert(alert_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        return {"message": "Alert acknowledged successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to acknowledge alert: {str(e)}"
        )


@router.get("/insights", response_model=List[TwinInsightResponse])
async def get_insights(
    user_id: str = "demo_user",
    highlighted_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Get health insights generated by the digital twin."""
    try:
        service = DigitalTwinService(db)
        twin = await service.get_or_create_twin(user_id)
        
        is_highlighted = True if highlighted_only else None
        insights = await service.get_insights(twin.id, is_highlighted)
        
        return [
            TwinInsightResponse(
                id=insight.id,
                insight_type=insight.insight_type,
                title=insight.title,
                description=insight.description,
                confidence_level=insight.confidence_level,
                evidence_strength=insight.evidence_strength,
                health_impact=insight.health_impact,
                is_actionable=insight.is_actionable,
                suggested_actions=insight.suggested_actions,
                priority=insight.priority
            )
            for insight in insights
        ]
        
    except Exception as e:
        logger.warning(f"Database unavailable, returning empty insights: {e}")
        return []  # Return empty list when database is not available


@router.post("/sync")
async def sync_historical_data(
    user_id: str = "demo_user",
    db: AsyncSession = Depends(get_db)
):
    """
    Sync all historical health data to the digital twin.
    
    This endpoint automatically:
    - Syncs all past health assessments
    - Syncs all health data points
    - Creates health events in the timeline
    - Triggers automatic learning
    """
    try:
        from app.services.twin_integration import TwinIntegrationService
        
        integration_service = TwinIntegrationService(db)
        
        # Sync all historical data
        sync_stats = await integration_service.sync_all_user_health_data(user_id)
        
        # Auto-learn if enough data
        learning_results = await integration_service.auto_learn_from_recent_data(user_id, min_events=3)
        
        return {
            "message": "Historical data synced successfully",
            "sync_stats": sync_stats,
            "learning_results": learning_results,
            "twin_ready": True
        }
        
    except Exception as e:
        logger.error(f"Error syncing historical data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync historical data: {str(e)}"
        )


@router.post("/learn")
async def trigger_learning(
    user_id: str = "demo_user",
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger the digital twin to analyze recent data and discover new patterns.
    
    This manually initiates the learning process.
    """
    try:
        from app.services.twin_integration import TwinIntegrationService
        
        integration_service = TwinIntegrationService(db)
        
        # First, ensure all recent data is synced
        await integration_service.sync_all_user_health_data(user_id)
        
        # Then trigger learning
        learning_results = await integration_service.auto_learn_from_recent_data(user_id, min_events=3)
        
        if not learning_results:
            twin_service = DigitalTwinService(db)
            twin = await twin_service.get_or_create_twin(user_id)
            events = await twin_service.get_timeline(twin.id, limit=10)
            
            return {
                "message": "Not enough data to learn patterns yet",
                "events_count": len(events),
                "minimum_required": 3,
                "suggestion": "Complete a few health assessments first"
            }
        
        return {
            "message": "Learning completed successfully",
            **learning_results,
            "twin_updated": True
        }
        
    except Exception as e:
        logger.error(f"Error during twin learning: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete learning: {str(e)}"
        )

