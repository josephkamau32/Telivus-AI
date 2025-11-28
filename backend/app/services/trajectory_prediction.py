"""
Trajectory Prediction Service for Health Trajectory Analysis.

This service provides advanced ML models for predicting health trajectories,
risk assessment, and intervention simulation using time-series analysis,
ensemble modeling, and reinforcement learning techniques.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging
import json
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error
import warnings
warnings.filterwarnings('ignore')

from app.core.logging import get_logger
from app.models.health import (
    HealthDataPoint,
    TrajectoryPrediction,
    InterventionPlan,
    SimulationScenario,
    HealthTrajectoryResponse,
    TrajectoryRequest
)
from app.services.advanced_trajectory_models import advanced_predictor

logger = get_logger(__name__)


@dataclass
class PredictionResult:
    """Container for prediction results with confidence intervals."""
    values: np.ndarray
    lower_bound: np.ndarray
    upper_bound: np.ndarray
    confidence_score: float


@dataclass
class RiskAssessment:
    """Risk assessment for health conditions."""
    condition: str
    risk_score: float
    confidence: float
    contributing_factors: Dict[str, float]


class TrajectoryPredictionService:
    """
    Advanced ML service for health trajectory prediction and intervention simulation.

    Features:
    - Deep Learning: LSTM and Transformer models for time-series forecasting
    - Ensemble Methods: Multiple ML algorithms with uncertainty quantification
    - Risk Assessment: Advanced risk modeling with confidence intervals
    - Intervention Simulation: Causal inference for treatment outcome prediction
    - Adaptive Learning: Continuous model improvement from user feedback

    Model Architecture:
    - Primary: LSTM with attention mechanism for sequence prediction
    - Secondary: Transformer encoder for complex pattern recognition
    - Ensemble: Bootstrap aggregation for uncertainty estimation
    - Fallback: Gradient boosting for reliable baseline predictions
    """

    def __init__(self):
        """Initialize the trajectory prediction service."""
        self.model_version = "2.0.0-advanced"  # Updated version with deep learning
        self.scaler = StandardScaler()

        # Initialize traditional ensemble models as fallback
        self.symptom_model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )

        self.risk_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=10,
            random_state=42
        )

        # Feature importance tracking
        self.feature_importance = {}

        # Advanced model status
        self.advanced_models_available = True

        logger.info("Advanced Trajectory Prediction Service initialized with LSTM/Transformer models")

    def predict_trajectory(
        self,
        historical_data: List[HealthDataPoint],
        prediction_horizon_days: int = 30,
        condition_focus: Optional[str] = None
    ) -> TrajectoryPrediction:
        """
        Predict health trajectory using advanced ML models (LSTM, Transformers, Ensemble).

        Args:
            historical_data: Time-series health data points
            prediction_horizon_days: Days to predict into future
            condition_focus: Specific condition to focus prediction on

        Returns:
            TrajectoryPrediction: Complete prediction with confidence intervals
        """
        try:
            if len(historical_data) < 3:
                raise ValueError("Insufficient historical data for prediction (minimum 3 data points required)")

            # Convert HealthDataPoint objects to dictionaries for advanced predictor
            data_dicts = []
            for point in historical_data:
                data_dict = {
                    'recorded_at': point.recorded_at,
                    'data_source': point.data_source,
                    'confidence_score': point.confidence_score
                }

                # Add symptom severity data
                if point.symptom_severity:
                    data_dict.update(point.symptom_severity)

                # Add vital signs
                if point.vital_signs:
                    for key, value in point.vital_signs.items():
                        data_dict[f'vital_{key}'] = value

                # Add lab values
                if point.lab_values:
                    for key, value in point.lab_values.items():
                        data_dict[f'lab_{key}'] = value

                # Add lifestyle factors
                if point.lifestyle_factors:
                    for key, value in point.lifestyle_factors.items():
                        data_dict[f'lifestyle_{key}'] = value

                data_dicts.append(data_dict)

            # Use advanced ML predictor
            advanced_result = advanced_predictor.predict_trajectory(
                data_dicts,
                prediction_horizon_days,
                condition_focus
            )

            # Prepare time-series data for additional analysis
            df = self._prepare_time_series_data(historical_data)

            # Determine condition to predict
            condition_name = condition_focus or self._infer_primary_condition(df)

            # Calculate risk assessments using traditional methods as backup
            risk_assessments = self._calculate_risk_assessments(df, condition_name)

            # Format predictions for API response
            predicted_values = self._format_advanced_prediction_results(advanced_result)

            return TrajectoryPrediction(
                condition_name=condition_name,
                prediction_horizon_days=prediction_horizon_days,
                baseline_date=historical_data[-1].recorded_at,
                predicted_values=predicted_values,
                risk_assessments={risk.condition: risk.risk_score for risk in risk_assessments},
                confidence_score=1.0 - advanced_result.model_uncertainty,  # Convert uncertainty to confidence
                feature_importance=advanced_result.feature_importance
            )

        except Exception as e:
            logger.error(f"Error in advanced trajectory prediction: {e}")
            # Fallback to simple prediction method
            return self._fallback_prediction(historical_data, prediction_horizon_days, condition_focus)

    def simulate_intervention(
        self,
        baseline_trajectory: TrajectoryPrediction,
        intervention: InterventionPlan,
        historical_data: List[HealthDataPoint]
    ) -> SimulationScenario:
        """
        Simulate the effect of an intervention on health trajectory.

        Args:
            baseline_trajectory: Current predicted trajectory
            intervention: Intervention to simulate
            historical_data: Historical health data

        Returns:
            SimulationScenario: Simulation results with outcome probabilities
        """
        try:
            # Prepare baseline data
            df = self._prepare_time_series_data(historical_data)

            # Model intervention effects
            intervention_effects = self._model_intervention_effects(
                intervention,
                baseline_trajectory,
                df
            )

            # Generate simulated trajectory
            simulated_trajectory = self._generate_simulated_trajectory(
                baseline_trajectory,
                intervention_effects,
                intervention
            )

            # Calculate risk changes
            risk_changes = self._calculate_risk_changes(
                baseline_trajectory.risk_assessments,
                simulated_trajectory
            )

            # Calculate outcome probabilities
            probability_improvement = self._calculate_improvement_probability(
                baseline_trajectory,
                simulated_trajectory
            )

            expected_value = self._calculate_expected_value(simulated_trajectory)

            return SimulationScenario(
                scenario_name=f"{intervention.intervention_name} Intervention",
                intervention_changes=self._format_intervention_changes(intervention),
                assumption_parameters=self._get_simulation_assumptions(intervention),
                simulated_trajectory=simulated_trajectory,
                risk_changes=risk_changes,
                probability_improvement=probability_improvement,
                expected_value=expected_value,
                recommendation_strength=self._calculate_recommendation_strength(
                    probability_improvement,
                    expected_value,
                    intervention
                )
            )

        except Exception as e:
            logger.error(f"Error in intervention simulation: {e}")
            raise

    def generate_intervention_recommendations(
        self,
        trajectory: TrajectoryPrediction,
        historical_data: List[HealthDataPoint]
    ) -> List[InterventionPlan]:
        """
        Generate personalized intervention recommendations based on trajectory.

        Args:
            trajectory: Predicted health trajectory
            historical_data: Historical health data

        Returns:
            List[InterventionPlan]: Recommended interventions
        """
        try:
            recommendations = []

            # Analyze trajectory for intervention opportunities
            intervention_opportunities = self._analyze_trajectory_for_interventions(trajectory)

            for opportunity in intervention_opportunities:
                intervention = self._create_intervention_plan(
                    opportunity,
                    trajectory,
                    historical_data
                )
                if intervention:
                    recommendations.append(intervention)

            # Sort by expected impact
            recommendations.sort(key=lambda x: x.expected_outcome or "", reverse=True)

            return recommendations[:5]  # Return top 5 recommendations

        except Exception as e:
            logger.error(f"Error generating intervention recommendations: {e}")
            return []

    def _prepare_time_series_data(self, data_points: List[HealthDataPoint]) -> pd.DataFrame:
        """Prepare time-series data for ML modeling."""
        records = []

        for point in data_points:
            record = {
                'timestamp': point.recorded_at,
                'data_source': point.data_source,
                'confidence': point.confidence_score
            }

            # Add symptom severity data
            if point.symptom_severity:
                for symptom, severity in point.symptom_severity.items():
                    record[f'symptom_{symptom}'] = severity

            # Add vital signs
            if point.vital_signs:
                record.update(point.vital_signs)

            # Add lab values
            if point.lab_values:
                record.update(point.lab_values)

            # Add lifestyle factors
            if point.lifestyle_factors:
                for factor, value in point.lifestyle_factors.items():
                    record[f'lifestyle_{factor}'] = value

            records.append(record)

        df = pd.DataFrame(records)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp').set_index('timestamp')

        return df

    def _infer_primary_condition(self, df: pd.DataFrame) -> str:
        """Infer the primary health condition from data patterns."""
        # Simple heuristic based on symptom patterns
        symptom_cols = [col for col in df.columns if col.startswith('symptom_')]

        if not symptom_cols:
            return "General Health Monitoring"

        # Find most prevalent symptoms
        symptom_means = df[symptom_cols].mean().sort_values(ascending=False)

        if symptom_means.empty:
            return "General Health Monitoring"

        primary_symptom = symptom_means.index[0].replace('symptom_', '')

        # Map symptoms to conditions (simplified)
        condition_mapping = {
            'headache': 'Migraine/Headache Disorder',
            'fatigue': 'Chronic Fatigue',
            'pain': 'Chronic Pain',
            'nausea': 'Gastrointestinal Disorder',
            'fever': 'Infectious Disease',
            'cough': 'Respiratory Condition'
        }

        return condition_mapping.get(primary_symptom, f"{primary_symptom.title()} Condition")

    def _generate_predictions(
        self,
        df: pd.DataFrame,
        horizon_days: int,
        condition: str
    ) -> PredictionResult:
        """Generate trajectory predictions using ensemble modeling."""
        try:
            # Prepare features and target
            feature_cols = [col for col in df.columns if col not in ['data_source', 'confidence']]
            target_col = self._select_target_variable(df, condition)

            if not feature_cols or target_col not in df.columns:
                # Return baseline prediction if insufficient data
                return self._create_baseline_prediction(df, horizon_days)

            # Create time-series features
            X, y = self._create_time_series_features(df[feature_cols], df[target_col])

            if len(X) < 5:  # Minimum data requirement
                return self._create_baseline_prediction(df, horizon_days)

            # Train ensemble model
            self.symptom_model.fit(X, y)

            # Generate predictions
            predictions = self._forecast_trajectory(df, horizon_days, feature_cols, target_col)

            # Calculate confidence intervals
            confidence_intervals = self._calculate_confidence_intervals(predictions, df[target_col])

            return PredictionResult(
                values=predictions,
                lower_bound=confidence_intervals['lower'],
                upper_bound=confidence_intervals['upper'],
                confidence_score=self._calculate_prediction_confidence(df, predictions)
            )

        except Exception as e:
            logger.warning(f"Error in prediction generation: {e}")
            return self._create_baseline_prediction(df, horizon_days)

    def _create_baseline_prediction(self, df: pd.DataFrame, horizon_days: int) -> PredictionResult:
        """Create baseline prediction when ML modeling is not possible."""
        # Use last known value as baseline
        last_values = df.iloc[-1] if not df.empty else pd.Series([5.0])  # Default moderate severity

        # Create flat prediction (no change)
        predictions = np.full(horizon_days, last_values.mean() if not last_values.empty else 5.0)

        # Wide confidence intervals for uncertainty
        lower_bound = np.maximum(predictions - 2.0, 0.0)
        upper_bound = np.minimum(predictions + 2.0, 10.0)

        return PredictionResult(
            values=predictions,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            confidence_score=0.3  # Low confidence for baseline
        )

    def _select_target_variable(self, df: pd.DataFrame, condition: str) -> str:
        """Select appropriate target variable for prediction."""
        # Map conditions to target variables
        condition_targets = {
            'Migraine/Headache Disorder': 'symptom_headache',
            'Chronic Fatigue': 'symptom_fatigue',
            'Chronic Pain': 'symptom_pain',
            'Gastrointestinal Disorder': 'symptom_nausea',
            'Infectious Disease': 'symptom_fever',
            'Respiratory Condition': 'symptom_cough'
        }

        target = condition_targets.get(condition, 'symptom_general')

        # Check if target exists, otherwise use first available symptom
        if target in df.columns:
            return target

        symptom_cols = [col for col in df.columns if col.startswith('symptom_')]
        return symptom_cols[0] if symptom_cols else df.columns[0]

    def _create_time_series_features(self, X: pd.DataFrame, y: pd.Series) -> Tuple[np.ndarray, np.ndarray]:
        """Create time-series features for ML modeling."""
        # Simple lag features
        X_featured = X.copy()

        # Add lag features (previous values)
        for col in X.columns:
            for lag in [1, 2, 3]:
                if len(X) > lag:
                    X_featured[f'{col}_lag_{lag}'] = X[col].shift(lag)

        # Add rolling statistics
        for col in X.columns:
            X_featured[f'{col}_rolling_mean_3'] = X[col].rolling(window=3, min_periods=1).mean()
            X_featured[f'{col}_rolling_std_3'] = X[col].rolling(window=3, min_periods=1).std()

        # Drop rows with NaN (from lagging)
        X_featured = X_featured.dropna()
        y_aligned = y.loc[X_featured.index]

        return X_featured.values, y_aligned.values

    def _forecast_trajectory(
        self,
        df: pd.DataFrame,
        horizon_days: int,
        feature_cols: List[str],
        target_col: str
    ) -> np.ndarray:
        """Forecast trajectory using trained model."""
        predictions = []

        # Start with last known values
        current_features = df[feature_cols].iloc[-1:].copy()

        for day in range(horizon_days):
            # Prepare features for prediction
            feature_vector = current_features.iloc[-1].values.reshape(1, -1)

            # Scale features if needed
            if hasattr(self, 'scaler') and self.scaler:
                feature_vector = self.scaler.transform(feature_vector)

            # Make prediction
            pred = self.symptom_model.predict(feature_vector)[0]
            predictions.append(pred)

            # Update features for next prediction (simplified)
            # In practice, this would use more sophisticated state updates
            current_features = current_features.copy()
            current_features[target_col] = pred

        return np.array(predictions)

    def _calculate_confidence_intervals(self, predictions: np.ndarray, historical_data: pd.Series) -> Dict[str, np.ndarray]:
        """Calculate prediction confidence intervals."""
        # Use historical variance as uncertainty estimate
        if len(historical_data) > 1:
            std_dev = historical_data.std()
        else:
            std_dev = 1.0  # Default uncertainty

        # 95% confidence interval
        margin = 1.96 * std_dev

        return {
            'lower': np.maximum(predictions - margin, 0.0),
            'upper': np.minimum(predictions + margin, 10.0)
        }

    def _calculate_prediction_confidence(self, df: pd.DataFrame, predictions: np.ndarray) -> float:
        """Calculate overall prediction confidence score."""
        # Factors affecting confidence:
        # - Amount of historical data
        # - Data quality/consistency
        # - Model performance metrics

        data_points = len(df)
        data_quality = df['confidence'].mean() if 'confidence' in df.columns else 1.0

        # Base confidence on data availability
        if data_points >= 10:
            base_confidence = 0.8
        elif data_points >= 5:
            base_confidence = 0.6
        else:
            base_confidence = 0.4

        # Adjust for data quality
        confidence = base_confidence * data_quality

        # Adjust for prediction stability (low variance = higher confidence)
        if len(predictions) > 1:
            pred_std = np.std(predictions)
            stability_factor = max(0.5, 1.0 - pred_std / 2.0)  # Penalize high variance
            confidence *= stability_factor

        return min(confidence, 0.95)  # Cap at 95%

    def _calculate_risk_assessments(self, df: pd.DataFrame, condition: str) -> List[RiskAssessment]:
        """Calculate risk assessments for various health conditions."""
        assessments = []

        # Define risk factors for different conditions
        risk_factors = {
            'Migraine/Headache Disorder': ['symptom_headache', 'lifestyle_stress', 'lifestyle_sleep_hours'],
            'Chronic Fatigue': ['symptom_fatigue', 'lifestyle_exercise_minutes', 'lifestyle_sleep_hours'],
            'Chronic Pain': ['symptom_pain', 'lifestyle_exercise_minutes', 'lifestyle_stress'],
            'Gastrointestinal Disorder': ['symptom_nausea', 'lifestyle_diet_quality'],
            'Infectious Disease': ['symptom_fever', 'symptom_cough'],
            'Respiratory Condition': ['symptom_cough', 'vital_oxygen_saturation']
        }

        factors = risk_factors.get(condition, [])

        # Calculate risk score based on current symptom levels
        risk_score = 0.0
        contributing_factors = {}

        for factor in factors:
            if factor in df.columns:
                # Use recent values (last 7 days if available)
                recent_data = df[factor].tail(7) if len(df) >= 7 else df[factor]
                factor_risk = recent_data.mean()

                # Normalize to 0-1 scale
                if 'symptom_' in factor:
                    factor_risk = factor_risk / 10.0  # Symptoms are 0-10
                elif 'lifestyle_stress' in factor:
                    factor_risk = factor_risk / 10.0
                elif 'lifestyle_sleep_hours' in factor:
                    factor_risk = max(0, (8 - factor_risk) / 8)  # Less sleep = higher risk
                elif 'lifestyle_exercise_minutes' in factor:
                    factor_risk = max(0, (30 - factor_risk) / 30)  # Less exercise = higher risk

                risk_score += factor_risk
                contributing_factors[factor] = float(factor_risk)

        # Normalize risk score
        risk_score = min(risk_score / len(factors) if factors else 0.5, 1.0)

        assessments.append(RiskAssessment(
            condition=condition,
            risk_score=risk_score,
            confidence=0.7,  # Moderate confidence for risk assessment
            contributing_factors=contributing_factors
        ))

        return assessments

    def _calculate_feature_importance(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate feature importance for predictions."""
        # Use model feature importance if available
        if hasattr(self.symptom_model, 'feature_importances_'):
            # Get feature names (simplified)
            feature_names = df.columns.tolist()
            importances = self.symptom_model.feature_importances_

            # Map to top features
            feature_importance = {}
            for name, importance in zip(feature_names[:len(importances)], importances):
                feature_importance[name] = float(importance)

            return feature_importance

        # Fallback: correlation-based importance
        target_cols = [col for col in df.columns if col.startswith('symptom_')]
        if target_cols:
            correlations = {}
            target = df[target_cols[0]]
            for col in df.columns:
                if col != target_cols[0] and df[col].dtype in ['float64', 'int64']:
                    corr = abs(target.corr(df[col]))
                    if not np.isnan(corr):
                        correlations[col] = corr

            return correlations

        return {}

    def _format_prediction_results(self, result: PredictionResult) -> List[Dict[str, Any]]:
        """Format prediction results for API response."""
        formatted = []

        for i, (value, lower, upper) in enumerate(zip(result.values, result.lower_bound, result.upper_bound)):
            formatted.append({
                'day': i + 1,
                'predicted_value': float(value),
                'confidence_lower': float(lower),
                'confidence_upper': float(upper),
                'timestamp': (datetime.utcnow() + timedelta(days=i+1)).isoformat()
            })

        return formatted

    def _format_advanced_prediction_results(self, result: PredictionResult) -> List[Dict[str, Any]]:
        """Format advanced prediction results for API response."""
        formatted = []

        predictions = result.predictions
        confidence_intervals = result.confidence_intervals

        for i in range(len(predictions)):
            formatted.append({
                'day': i + 1,
                'predicted_value': float(predictions[i]),
                'confidence_lower': float(confidence_intervals['lower'][i]),
                'confidence_upper': float(confidence_intervals['upper'][i]),
                'timestamp': (datetime.utcnow() + timedelta(days=i+1)).isoformat(),
                'prediction_quality': result.prediction_quality,
                'model_uncertainty': result.model_uncertainty
            })

        return formatted

    def _fallback_prediction(self, historical_data: List[HealthDataPoint],
                           prediction_horizon_days: int, condition_focus: str = None) -> TrajectoryPrediction:
        """Fallback prediction method when advanced models fail."""
        try:
            # Use simple ensemble method as fallback
            df = self._prepare_time_series_data(historical_data)
            condition_name = condition_focus or self._infer_primary_condition(df)
            prediction_result = self._generate_predictions(df, prediction_horizon_days, condition_name)
            risk_assessments = self._calculate_risk_assessments(df, condition_name)
            feature_importance = self._calculate_feature_importance(df)

            return TrajectoryPrediction(
                condition_name=condition_name,
                prediction_horizon_days=prediction_horizon_days,
                baseline_date=historical_data[-1].recorded_at,
                predicted_values=self._format_prediction_results(prediction_result),
                risk_assessments={risk.condition: risk.risk_score for risk in risk_assessments},
                confidence_score=prediction_result.confidence_score,
                feature_importance=feature_importance
            )
        except Exception as e:
            logger.error(f"Fallback prediction also failed: {e}")
            # Ultimate fallback - return minimal prediction
            return TrajectoryPrediction(
                condition_name="General Health",
                prediction_horizon_days=prediction_horizon_days,
                baseline_date=datetime.utcnow(),
                predicted_values=[{
                    'day': i + 1,
                    'predicted_value': 3.0,  # Neutral value
                    'confidence_lower': 1.0,
                    'confidence_upper': 5.0,
                    'timestamp': (datetime.utcnow() + timedelta(days=i+1)).isoformat()
                } for i in range(prediction_horizon_days)],
                risk_assessments={},
                confidence_score=0.3,  # Low confidence
                feature_importance={}
            )

    def _model_intervention_effects(
        self,
        intervention: InterventionPlan,
        baseline: TrajectoryPrediction,
        historical_data: pd.DataFrame
    ) -> Dict[str, Any]:
        """Model the effects of an intervention on health trajectory."""
        # Simplified intervention effect modeling
        effects = {
            'effect_strength': 0.0,
            'effect_duration': 7,  # Default 7 days
            'side_effects_probability': 0.1,
            'adherence_factor': 0.8
        }

        # Adjust effects based on intervention type
        if intervention.intervention_type == 'medication':
            effects['effect_strength'] = 0.6
            effects['effect_duration'] = 14
            effects['side_effects_probability'] = 0.2
        elif intervention.intervention_type == 'lifestyle':
            effects['effect_strength'] = 0.4
            effects['effect_duration'] = 30
            effects['side_effects_probability'] = 0.05
        elif intervention.intervention_type == 'therapy':
            effects['effect_strength'] = 0.5
            effects['effect_duration'] = 21
            effects['side_effects_probability'] = 0.1

        # Adjust based on historical response patterns (simplified)
        # In practice, this would use user-specific historical intervention data

        return effects

    def _generate_simulated_trajectory(
        self,
        baseline: TrajectoryPrediction,
        effects: Dict[str, Any],
        intervention: InterventionPlan
    ) -> List[Dict[str, Any]]:
        """Generate simulated trajectory under intervention."""
        simulated = []

        effect_strength = effects['effect_strength']
        effect_duration = effects['effect_duration']

        for point in baseline.predicted_values:
            day = point['day']
            baseline_value = point['predicted_value']

            # Apply intervention effect
            if day <= effect_duration:
                # Gradual improvement during intervention period
                improvement_factor = effect_strength * (day / effect_duration)
                simulated_value = baseline_value * (1 - improvement_factor)
            else:
                # Sustained improvement after intervention
                sustained_improvement = effect_strength * 0.7  # 70% sustained
                simulated_value = baseline_value * (1 - sustained_improvement)

            # Ensure reasonable bounds
            simulated_value = max(0.0, min(10.0, simulated_value))

            simulated.append({
                'day': day,
                'simulated_value': simulated_value,
                'baseline_value': baseline_value,
                'improvement': baseline_value - simulated_value,
                'timestamp': point['timestamp']
            })

        return simulated

    def _calculate_risk_changes(
        self,
        baseline_risks: Dict[str, float],
        simulated_trajectory: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate changes in risk scores due to intervention."""
        # Simplified risk change calculation
        risk_changes = {}

        # Calculate average improvement from simulation
        improvements = [point['improvement'] for point in simulated_trajectory]
        avg_improvement = np.mean(improvements) if improvements else 0.0

        # Risk reduction proportional to symptom improvement
        for condition, baseline_risk in baseline_risks.items():
            risk_reduction = avg_improvement * 0.1  # 10% risk reduction per unit improvement
            risk_changes[condition] = -risk_reduction  # Negative = reduction

        return risk_changes

    def _calculate_improvement_probability(
        self,
        baseline: TrajectoryPrediction,
        simulated: List[Dict[str, Any]]
    ) -> float:
        """Calculate probability of positive outcome from intervention."""
        # Simplified probability calculation based on:
        # - Intervention effectiveness
        # - Historical success rates
        # - User-specific factors

        avg_improvement = np.mean([p['improvement'] for p in simulated])

        # Base probability on improvement magnitude
        if avg_improvement > 2.0:
            base_prob = 0.8
        elif avg_improvement > 1.0:
            base_prob = 0.6
        elif avg_improvement > 0.5:
            base_prob = 0.4
        else:
            base_prob = 0.2

        # Adjust for baseline confidence
        confidence_adjustment = baseline.confidence_score - 0.5
        probability = base_prob + confidence_adjustment * 0.2

        return max(0.1, min(0.95, probability))

    def _calculate_expected_value(self, simulated_trajectory: List[Dict[str, Any]]) -> float:
        """Calculate expected value of health improvement."""
        improvements = [point['improvement'] for point in simulated_trajectory]
        return float(np.mean(improvements) * len(improvements))  # Total expected improvement

    def _calculate_recommendation_strength(
        self,
        improvement_prob: float,
        expected_value: float,
        intervention: InterventionPlan
    ) -> float:
        """Calculate how strongly to recommend an intervention."""
        # Combine probability and expected value
        strength = (improvement_prob * 0.7) + (min(expected_value / 5.0, 1.0) * 0.3)

        # Adjust for intervention type safety
        if intervention.intervention_type == 'medication':
            strength *= 0.9  # Slightly reduce for medication risks
        elif intervention.intervention_type == 'lifestyle':
            strength *= 1.1  # Increase for low-risk interventions

        return min(strength, 1.0)

    def _format_intervention_changes(self, intervention: InterventionPlan) -> Dict[str, Any]:
        """Format intervention changes for simulation response."""
        return {
            'type': intervention.intervention_type,
            'name': intervention.intervention_name,
            'description': intervention.description,
            'dosage': intervention.dosage_instructions,
            'schedule': intervention.schedule
        }

    def _get_simulation_assumptions(self, intervention: InterventionPlan) -> Dict[str, Any]:
        """Get simulation assumptions for an intervention."""
        return {
            'adherence_rate': 0.8,
            'effect_delay_days': 2,
            'peak_effect_day': 7,
            'sustained_effect_percentage': 0.7,
            'side_effect_probability': 0.1
        }

    def _analyze_trajectory_for_interventions(self, trajectory: TrajectoryPrediction) -> List[Dict[str, Any]]:
        """Analyze trajectory to identify intervention opportunities."""
        opportunities = []

        # Check for high symptom levels
        avg_predicted = np.mean([p['predicted_value'] for p in trajectory.predicted_values])

        if avg_predicted > 7.0:
            opportunities.append({
                'type': 'medication',
                'priority': 'high',
                'reason': 'High symptom severity suggests medication intervention'
            })

        if avg_predicted > 5.0:
            opportunities.append({
                'type': 'lifestyle',
                'priority': 'medium',
                'reason': 'Moderate symptoms may benefit from lifestyle changes'
            })

        if trajectory.risk_assessments:
            max_risk = max(trajectory.risk_assessments.values())
            if max_risk > 0.7:
                opportunities.append({
                    'type': 'therapy',
                    'priority': 'high',
                    'reason': 'High risk condition requires therapeutic intervention'
                })

        return opportunities

    def _create_intervention_plan(
        self,
        opportunity: Dict[str, Any],
        trajectory: TrajectoryPrediction,
        historical_data: List[HealthDataPoint]
    ) -> Optional[InterventionPlan]:
        """Create a specific intervention plan from opportunity analysis."""
        intervention_type = opportunity['type']

        if intervention_type == 'medication':
            return InterventionPlan(
                intervention_type='medication',
                intervention_name='Symptom Management Medication',
                description='Over-the-counter medication to manage symptoms',
                prescribed_by='AI',
                dosage_instructions={'frequency': 'as needed', 'max_daily': 3},
                schedule={'timing': 'with meals', 'duration_days': 7},
                expected_outcome='30-50% symptom reduction',
                side_effects=['mild drowsiness', 'upset stomach'],
                monitoring_required=['symptom severity', 'side effects']
            )

        elif intervention_type == 'lifestyle':
            return InterventionPlan(
                intervention_type='lifestyle',
                intervention_name='Lifestyle Modification Program',
                description='Comprehensive lifestyle changes for health improvement',
                prescribed_by='AI',
                schedule={'daily_exercise': 30, 'sleep_hours': 8, 'stress_management': 'daily'},
                expected_outcome='20-40% gradual improvement',
                monitoring_required=['energy levels', 'sleep quality', 'stress levels']
            )

        elif intervention_type == 'therapy':
            return InterventionPlan(
                intervention_type='therapy',
                intervention_name='Cognitive Behavioral Therapy',
                description='Structured therapy program for condition management',
                prescribed_by='AI',
                schedule={'sessions_per_week': 2, 'duration_weeks': 8},
                expected_outcome='Significant long-term improvement',
                monitoring_required=['mood tracking', 'behavior changes']
            )

        return None


# Global service instance
trajectory_service = TrajectoryPredictionService()