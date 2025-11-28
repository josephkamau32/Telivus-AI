"""
Trajectory prediction and intervention simulation endpoints.

Provides endpoints for health trajectory analysis, intervention recommendations,
and outcome simulation using advanced ML models.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.models.health import (
    TrajectoryRequest,
    HealthTrajectoryResponse,
    InterventionTrackingRequest
)
from app.services.trajectory_service import trajectory_service_instance
from app.core.database import get_db
from app.core.logging import get_logger

# Create router
router = APIRouter()

# Get logger
logger = get_logger(__name__)


@router.post(
    "/analyze",
    response_model=HealthTrajectoryResponse,
    summary="Analyze Health Trajectory",
    description="""
    Generate comprehensive health trajectory analysis and predictions.

    This endpoint uses advanced ML models to:
    - Analyze historical health data patterns
    - Predict future health trajectories with confidence intervals
    - Assess risk scores for various conditions
    - Recommend personalized interventions
    - Simulate intervention outcomes (optional)

    **Note**: Requires sufficient historical health data for accurate predictions.
    """
)
async def analyze_trajectory(
    *,
    background_tasks: BackgroundTasks,
    request: TrajectoryRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Analyze health trajectory and generate predictions.

    Args:
        background_tasks: FastAPI background tasks
        request: Trajectory analysis request
        db: Database session

    Returns:
        HealthTrajectoryResponse: Complete trajectory analysis

    Raises:
        HTTPException: If analysis fails or insufficient data
    """
    try:
        logger.info(f"Analyzing trajectory for user {request.user_id}")

        # Validate user exists (simplified - in production use proper auth)
        # For now, assume user validation is handled upstream

        # Perform trajectory analysis
        trajectory_response = await trajectory_service_instance.analyze_trajectory(
            request, db
        )

        # Add background task for analytics
        background_tasks.add_task(
            _log_trajectory_metrics,
            request.user_id,
            trajectory_response.trajectory_id,
            request
        )

        logger.info(f"Successfully generated trajectory analysis for user {request.user_id}")
        return trajectory_response

    except ValueError as e:
        logger.warning(f"Trajectory analysis validation error: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to analyze trajectory: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze health trajectory. Please try again."
        )


@router.post(
    "/interventions/{intervention_id}/track",
    summary="Track Intervention Outcomes",
    description="""
    Track and update intervention outcomes and effectiveness.

    This endpoint allows users to report:
    - Adherence to intervention recommendations
    - Self-assessed effectiveness ratings
    - Health metric changes
    - Side effects experienced
    - Additional notes and observations

    The system uses this feedback to improve future recommendations.
    """
)
async def track_intervention_outcome(
    *,
    intervention_id: str,
    request: InterventionTrackingRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Track intervention outcomes and update trajectory.

    Args:
        intervention_id: Intervention identifier
        request: Intervention tracking data
        db: Database session

    Returns:
        Dict containing tracking confirmation

    Raises:
        HTTPException: If intervention not found or tracking fails
    """
    try:
        logger.info(f"Tracking outcome for intervention {intervention_id}")

        # Convert request to dict for service
        outcome_data = request.dict()

        # Track intervention outcome
        result = await trajectory_service_instance.track_intervention_outcome(
            intervention_id,
            outcome_data,
            db
        )

        logger.info(f"Successfully tracked outcome for intervention {intervention_id}")
        return result

    except ValueError as e:
        logger.warning(f"Intervention tracking validation error: {e}")
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to track intervention outcome: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to track intervention outcome. Please try again."
        )


@router.get(
    "/history/{user_id}",
    summary="Get Trajectory Analysis History",
    description="""
    Retrieve historical trajectory analyses for a user.

    Returns a list of previous trajectory analyses including:
    - Analysis dates and conditions
    - Prediction confidence scores
    - Number of interventions recommended
    - Current status of each analysis
    """
)
async def get_trajectory_history(
    *,
    user_id: str,
    limit: int = 10,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get trajectory analysis history for a user.

    Args:
        user_id: User identifier
        limit: Maximum number of analyses to return (default: 10)
        db: Database session

    Returns:
        Dict containing trajectory history

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Retrieving trajectory history for user {user_id}")

        # Validate limit
        if limit < 1 or limit > 50:
            raise ValueError("Limit must be between 1 and 50")

        # Get trajectory history
        history = await trajectory_service_instance.get_trajectory_history(
            user_id, db, limit
        )

        return {
            "user_id": user_id,
            "trajectory_count": len(history),
            "trajectories": history,
            "limit": limit
        }

    except ValueError as e:
        logger.warning(f"Trajectory history validation error: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to retrieve trajectory history: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve trajectory history. Please try again."
        )


@router.get(
    "/interventions/{user_id}",
    summary="Get User Interventions",
    description="""
    Retrieve all interventions for a user across all trajectories.

    Returns interventions with their current status, outcomes, and effectiveness metrics.
    """
)
async def get_user_interventions(
    *,
    user_id: str,
    status: str = None,  # planned, active, completed, discontinued
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get interventions for a user.

    Args:
        user_id: User identifier
        status: Filter by intervention status (optional)
        db: Database session

    Returns:
        Dict containing user interventions

    Raises:
        HTTPException: If retrieval fails
    """
    try:
        logger.info(f"Retrieving interventions for user {user_id}")

        from app.models.db_models import Intervention

        # Build query
        query = db.query(Intervention).filter(Intervention.user_id == user_id)

        if status:
            if status not in ['planned', 'active', 'completed', 'discontinued']:
                raise ValueError("Invalid status filter")
            query = query.filter(Intervention.status == status)

        # Get interventions
        interventions = query.order_by(Intervention.created_at.desc()).all()

        # Format response
        intervention_list = []
        for intervention in interventions:
            intervention_list.append({
                "id": intervention.id,
                "trajectory_id": intervention.trajectory_id,
                "type": intervention.intervention_type,
                "name": intervention.intervention_name,
                "description": intervention.description,
                "status": intervention.status,
                "prescribed_by": intervention.prescribed_by,
                "adherence_score": intervention.adherence_score,
                "effectiveness_score": intervention.effectiveness_score,
                "started_at": intervention.started_at.isoformat() if intervention.started_at else None,
                "completed_at": intervention.completed_at.isoformat() if intervention.completed_at else None,
                "created_at": intervention.created_at.isoformat(),
                "updated_at": intervention.updated_at.isoformat()
            })

        return {
            "user_id": user_id,
            "intervention_count": len(intervention_list),
            "interventions": intervention_list,
            "filter_status": status
        }

    except ValueError as e:
        logger.warning(f"Intervention retrieval validation error: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to retrieve user interventions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve interventions. Please try again."
        )


@router.post(
    "/simulate/{trajectory_id}",
    summary="Simulate Intervention Scenarios",
    description="""
    Simulate different intervention scenarios for an existing trajectory.

    This endpoint allows exploring "what-if" scenarios by modifying interventions
    and seeing projected outcomes. Useful for decision-making between treatment options.
    """
)
async def simulate_intervention_scenarios(
    *,
    trajectory_id: str,
    scenarios: List[Dict[str, Any]],  # List of scenario definitions
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Simulate intervention scenarios for a trajectory.

    Args:
        trajectory_id: Trajectory identifier
        scenarios: List of intervention scenarios to simulate
        db: Database session

    Returns:
        Dict containing simulation results

    Raises:
        HTTPException: If trajectory not found or simulation fails
    """
    try:
        logger.info(f"Simulating scenarios for trajectory {trajectory_id}")

        # Validate trajectory exists
        from app.models.db_models import HealthTrajectory
        trajectory = db.query(HealthTrajectory).filter(
            HealthTrajectory.id == trajectory_id
        ).first()

        if not trajectory:
            raise ValueError(f"Trajectory {trajectory_id} not found")

        # For now, return placeholder - full simulation logic would be complex
        # In production, this would integrate with the trajectory prediction service

        simulation_results = []
        for i, scenario in enumerate(scenarios):
            simulation_results.append({
                "scenario_id": f"sim_{i+1}",
                "scenario_name": scenario.get("name", f"Scenario {i+1}"),
                "projected_outcome": "Simulation results would be calculated here",
                "confidence_score": 0.75,
                "risk_change": -0.15  # Example risk reduction
            })

        return {
            "trajectory_id": trajectory_id,
            "simulation_count": len(simulation_results),
            "results": simulation_results,
            "note": "Full simulation engine implementation pending"
        }

    except ValueError as e:
        logger.warning(f"Simulation validation error: {e}")
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to simulate intervention scenarios: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to simulate intervention scenarios. Please try again."
        )


async def _log_trajectory_metrics(
    user_id: str,
    trajectory_id: str,
    request: TrajectoryRequest
):
    """
    Background task to log trajectory analysis metrics.

    Args:
        user_id: User identifier
        trajectory_id: Trajectory identifier
        request: Original request data
    """
    try:
        logger.info(f"Logging metrics for trajectory {trajectory_id} (user: {user_id})")

        # In production, this would log to analytics service
        # For now, just log completion
        logger.info(f"Trajectory analysis completed - User: {user_id}, Horizon: {request.prediction_horizon_days} days")

    except Exception as e:
        logger.warning(f"Failed to log trajectory metrics: {e}")