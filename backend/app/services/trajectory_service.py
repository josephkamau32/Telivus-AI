"""
Trajectory Service - Integration layer for health trajectory prediction and management.

This service provides the main interface for trajectory operations, integrating
ML models with database persistence and API responses.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import logging
import asyncio
from functools import lru_cache
import json

from app.core.logging import get_logger
from app.models.db_models import (
    HealthDataPoint,
    HealthTrajectory,
    Intervention,
    TrajectorySimulation,
    User
)
from app.models.health import (
    HealthDataPoint as HealthDataPointModel,
    TrajectoryRequest,
    HealthTrajectoryResponse,
    InterventionPlan,
    SimulationScenario
)
from app.services.trajectory_prediction import trajectory_service
from app.core.database import get_db

logger = get_logger(__name__)


class TrajectoryService:
    """
    Main service for health trajectory prediction and intervention management.

    Handles data persistence, ML model integration, and business logic for
    trajectory analysis and intervention simulation.
    """

    def __init__(self):
        """Initialize the trajectory service."""
        self.prediction_service = trajectory_service
        self._trajectory_cache = {}  # In-memory cache for trajectory results
        self._cache_expiry = {}  # Cache expiry times
        self.cache_ttl_hours = 24  # Cache trajectory results for 24 hours
        logger.info("Trajectory Service initialized")

    def _get_cache_key(self, user_id: str, request: Any) -> str:
        """Generate a cache key for trajectory analysis."""
        # Create a deterministic cache key based on request parameters
        key_data = {
            'user_id': user_id,
            'prediction_horizon_days': request.prediction_horizon_days,
            'include_simulations': request.include_simulations,
            'focus_conditions': request.focus_conditions or []
        }
        return f"trajectory_{hash(json.dumps(key_data, sort_keys=True))}"

    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached result is still valid."""
        if cache_key not in self._cache_expiry:
            return False

        return datetime.utcnow() < self._cache_expiry[cache_key]

    def _get_cached_result(self, cache_key: str) -> Optional[Any]:
        """Retrieve cached trajectory result."""
        if self._is_cache_valid(cache_key):
            logger.info(f"Cache hit for trajectory analysis: {cache_key}")
            return self._trajectory_cache.get(cache_key)
        return None

    def _cache_result(self, cache_key: str, result: Any):
        """Cache trajectory analysis result."""
        self._trajectory_cache[cache_key] = result
        self._cache_expiry[cache_key] = datetime.utcnow() + timedelta(hours=self.cache_ttl_hours)
        logger.info(f"Cached trajectory analysis result: {cache_key}")

    def _cleanup_expired_cache(self):
        """Clean up expired cache entries."""
        current_time = datetime.utcnow()
        expired_keys = [
            key for key, expiry in self._cache_expiry.items()
            if current_time > expiry
        ]

        for key in expired_keys:
            self._trajectory_cache.pop(key, None)
            self._cache_expiry.pop(key, None)

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

    async def analyze_trajectory(
        self,
        request: TrajectoryRequest,
        db: Session
    ) -> HealthTrajectoryResponse:
        """
        Analyze and predict health trajectory for a user.

        Args:
            request: Trajectory analysis request
            db: Database session

        Returns:
            HealthTrajectoryResponse: Complete trajectory analysis
        """
        try:
            # Clean up expired cache entries periodically
            self._cleanup_expired_cache()

            # Check cache first
            cache_key = self._get_cache_key(request.user_id, request)
            cached_result = self._get_cached_result(cache_key)
            if cached_result:
                logger.info(f"Returning cached trajectory analysis for user {request.user_id}")
                return cached_result

            # Retrieve historical health data
            historical_data = await self._get_historical_health_data(
                request.user_id,
                db,
                days_back=90  # Use last 90 days of data
            )

            if len(historical_data) < 2:
                raise ValueError("Insufficient historical health data for trajectory analysis")

            # Generate trajectory prediction
            prediction = self.prediction_service.predict_trajectory(
                historical_data,
                request.prediction_horizon_days,
                request.focus_conditions[0] if request.focus_conditions else None
            )

            # Generate intervention recommendations
            intervention_recommendations = self.prediction_service.generate_intervention_recommendations(
                prediction,
                historical_data
            )

            # Generate simulation scenarios if requested
            simulation_scenarios = []
            if request.include_simulations and intervention_recommendations:
                for intervention in intervention_recommendations[:3]:  # Limit to top 3
                    scenario = self.prediction_service.simulate_intervention(
                        prediction,
                        intervention,
                        historical_data
                    )
                    simulation_scenarios.append(scenario)

            # Create baseline data point
            baseline_data = self._create_baseline_data_point(historical_data)

            # Save trajectory to database
            trajectory_id = await self._save_trajectory_to_db(
                request.user_id,
                prediction,
                intervention_recommendations,
                simulation_scenarios,
                db
            )

            trajectory_response = HealthTrajectoryResponse(
                user_id=request.user_id,
                trajectory_id=trajectory_id,
                baseline_assessment=baseline_data,
                predictions=[prediction],
                recommended_interventions=intervention_recommendations,
                simulation_scenarios=simulation_scenarios,
                generated_at=datetime.utcnow(),
                model_version=self.prediction_service.model_version
            )

            # Cache the result for future requests
            self._cache_result(cache_key, trajectory_response)

            return trajectory_response

        except Exception as e:
            logger.error(f"Error in trajectory analysis: {e}")
            raise

    async def track_intervention_outcome(
        self,
        intervention_id: str,
        outcome_data: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Track and update intervention outcomes.

        Args:
            intervention_id: Intervention identifier
            outcome_data: Outcome tracking data
            db: Database session

        Returns:
            Dict containing updated intervention status
        """
        try:
            # Retrieve intervention
            intervention = db.query(Intervention).filter(
                Intervention.id == intervention_id
            ).first()

            if not intervention:
                raise ValueError(f"Intervention {intervention_id} not found")

            # Update intervention with outcome data
            if 'adherence_score' in outcome_data:
                intervention.adherence_score = outcome_data['adherence_score']

            if 'effectiveness_rating' in outcome_data:
                intervention.effectiveness_score = outcome_data['effectiveness_rating']

            if 'outcome_metrics' in outcome_data:
                intervention.outcome_metrics = outcome_data['outcome_metrics']

            if 'side_effects' in outcome_data:
                intervention.side_effects = outcome_data['side_effects']

            if 'notes' in outcome_data:
                intervention.notes = outcome_data['notes']

            # Update status based on outcomes
            intervention.status = self._determine_intervention_status(outcome_data)
            intervention.updated_at = datetime.utcnow()

            db.commit()

            # Update trajectory if needed
            await self._update_trajectory_from_outcomes(
                intervention.trajectory_id,
                outcome_data,
                db
            )

            return {
                "intervention_id": intervention_id,
                "status": intervention.status,
                "updated_at": intervention.updated_at.isoformat(),
                "message": "Intervention outcome tracked successfully"
            }

        except Exception as e:
            logger.error(f"Error tracking intervention outcome: {e}")
            db.rollback()
            raise

    async def get_trajectory_history(
        self,
        user_id: str,
        db: Session,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieve trajectory analysis history for a user.

        Args:
            user_id: User identifier
            limit: Maximum number of trajectories to return
            db: Database session

        Returns:
            List of trajectory summaries
        """
        try:
            trajectories = db.query(HealthTrajectory).filter(
                HealthTrajectory.user_id == user_id
            ).order_by(HealthTrajectory.last_updated.desc()).limit(limit).all()

            history = []
            for traj in trajectories:
                # Get associated interventions
                interventions = db.query(Intervention).filter(
                    Intervention.trajectory_id == traj.id
                ).all()

                history.append({
                    "trajectory_id": traj.id,
                    "condition_name": traj.condition_name,
                    "prediction_horizon_days": traj.prediction_horizon_days,
                    "confidence_score": traj.model_confidence,
                    "generated_at": traj.last_updated.isoformat(),
                    "intervention_count": len(interventions),
                    "status": traj.status
                })

            return history

        except Exception as e:
            logger.error(f"Error retrieving trajectory history: {e}")
            raise

    async def _get_historical_health_data(
        self,
        user_id: str,
        db: Session,
        days_back: int = 90
    ) -> List[HealthDataPointModel]:
        """
        Retrieve historical health data for trajectory analysis.

        Args:
            user_id: User identifier
            db: Database session
            days_back: Number of days of historical data to retrieve

        Returns:
            List of health data points
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)

            # Query health data points
            data_points = db.query(HealthDataPoint).filter(
                HealthDataPoint.user_id == user_id,
                HealthDataPoint.recorded_at >= cutoff_date
            ).order_by(HealthDataPoint.recorded_at).all()

            # Also include data from health reports
            health_reports = db.query(HealthReport).filter(
                HealthReport.user_id == user_id,
                HealthReport.created_at >= cutoff_date
            ).order_by(HealthReport.created_at).all()

            # Convert to model format
            health_data = []

            # Add data points
            for point in data_points:
                health_data.append(HealthDataPointModel(
                    symptom_severity=point.symptom_severity,
                    vital_signs=point.vital_signs,
                    lab_values=point.lab_values,
                    lifestyle_factors=point.lifestyle_factors,
                    recorded_at=point.recorded_at,
                    data_source=point.data_source,
                    confidence_score=point.confidence_score
                ))

            # Add assessment data as data points
            for report in health_reports:
                if report.report_data and 'symptoms' in report.report_data:
                    health_data.append(HealthDataPointModel(
                        symptom_severity=report.report_data.get('symptoms', {}),
                        recorded_at=report.created_at,
                        data_source='assessment',
                        confidence_score=report.confidence_score or 0.8
                    ))

            # Sort by timestamp
            health_data.sort(key=lambda x: x.recorded_at)

            return health_data

        except Exception as e:
            logger.error(f"Error retrieving historical health data: {e}")
            return []

    def _create_baseline_data_point(self, historical_data: List[HealthDataPointModel]) -> HealthDataPointModel:
        """Create baseline data point from recent historical data."""
        if not historical_data:
            return HealthDataPointModel(
                recorded_at=datetime.utcnow(),
                data_source='baseline',
                confidence_score=0.5
            )

        # Use most recent data point as baseline
        latest = historical_data[-1]

        return HealthDataPointModel(
            symptom_severity=latest.symptom_severity,
            vital_signs=latest.vital_signs,
            lab_values=latest.lab_values,
            lifestyle_factors=latest.lifestyle_factors,
            recorded_at=datetime.utcnow(),
            data_source='baseline',
            confidence_score=latest.confidence_score
        )

    async def _save_trajectory_to_db(
        self,
        user_id: str,
        prediction: Any,  # TrajectoryPrediction
        interventions: List[InterventionPlan],
        simulations: List[SimulationScenario],
        db: Session
    ) -> str:
        """
        Save trajectory analysis results to database.

        Args:
            user_id: User identifier
            prediction: Trajectory prediction results
            interventions: Recommended interventions
            simulations: Simulation scenarios
            db: Database session

        Returns:
            Trajectory ID
        """
        try:
            import uuid

            trajectory_id = str(uuid.uuid4())

            # Create trajectory record
            trajectory = HealthTrajectory(
                id=trajectory_id,
                user_id=user_id,
                trajectory_type="symptom_progression",
                condition_name=prediction.condition_name,
                prediction_horizon_days=prediction.prediction_horizon_days,
                baseline_data=self._format_baseline_data(prediction),
                predicted_trajectory=self._format_predicted_trajectory(prediction),
                risk_assessments=prediction.risk_assessments,
                model_version=self.prediction_service.model_version,
                model_confidence=prediction.confidence_score,
                feature_importance=prediction.feature_importance,
                baseline_date=prediction.baseline_date
            )

            db.add(trajectory)

            # Create intervention records
            for intervention in interventions:
                intervention_record = Intervention(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    trajectory_id=trajectory_id,
                    intervention_type=intervention.intervention_type,
                    intervention_name=intervention.intervention_name,
                    description=intervention.description,
                    prescribed_by=intervention.prescribed_by,
                    dosage_instructions=intervention.dosage_instructions,
                    schedule=intervention.schedule,
                    status="planned"
                )
                db.add(intervention_record)

            # Create simulation records
            for simulation in simulations:
                simulation_record = TrajectorySimulation(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    trajectory_id=trajectory_id,
                    scenario_name=simulation.scenario_name,
                    intervention_changes=simulation.intervention_changes,
                    assumption_parameters=simulation.assumption_parameters,
                    simulated_trajectory=simulation.simulated_trajectory,
                    risk_changes=simulation.risk_changes,
                    probability_improvement=simulation.probability_improvement,
                    expected_value=simulation.expected_value,
                    simulation_model=self.prediction_service.model_version
                )
                db.add(simulation_record)

            db.commit()

            return trajectory_id

        except Exception as e:
            logger.error(f"Error saving trajectory to database: {e}")
            db.rollback()
            raise

    def _format_baseline_data(self, prediction: Any) -> Dict[str, Any]:
        """Format baseline data for database storage."""
        # Simplified baseline formatting
        return {
            "condition": prediction.condition_name,
            "baseline_date": prediction.baseline_date.isoformat(),
            "confidence_score": prediction.confidence_score
        }

    def _format_predicted_trajectory(self, prediction: Any) -> Dict[str, Any]:
        """Format predicted trajectory for database storage."""
        return {
            "predictions": prediction.predicted_values,
            "confidence_score": prediction.confidence_score,
            "feature_importance": prediction.feature_importance
        }

    def _determine_intervention_status(self, outcome_data: Dict[str, Any]) -> str:
        """Determine intervention status based on outcome data."""
        adherence = outcome_data.get('adherence_score', 0)
        effectiveness = outcome_data.get('effectiveness_rating', 0)

        if adherence < 0.3:
            return "discontinued"  # Low adherence
        elif effectiveness >= 4:
            return "completed"    # Good results
        elif adherence >= 0.7:
            return "active"       # Continuing with good adherence
        else:
            return "active"       # Default to active

    async def _update_trajectory_from_outcomes(
        self,
        trajectory_id: str,
        outcome_data: Dict[str, Any],
        db: Session
    ):
        """Update trajectory based on intervention outcomes."""
        try:
            trajectory = db.query(HealthTrajectory).filter(
                HealthTrajectory.id == trajectory_id
            ).first()

            if trajectory:
                # Update last updated timestamp
                trajectory.last_updated = datetime.utcnow()

                # Could implement more sophisticated trajectory updates
                # based on intervention outcomes here

                db.commit()

        except Exception as e:
            logger.warning(f"Error updating trajectory from outcomes: {e}")
            db.rollback()


# Import HealthReport for type hints
from app.models.db_models import HealthReport

# Global service instance
trajectory_service_instance = TrajectoryService()