"""
Unit Tests for Trajectory Prediction Service

Tests the TrajectoryPredictionService class including:
- Health data point conversion
- Time-series preprocessing
- Condition inference
- Baseline predictions
- Confidence interval calculation
- Prediction with fallback
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

# Guard against missing ML dependencies
try:
    import optuna  # noqa: F401
    HAS_OPTUNA = True
except ImportError:
    HAS_OPTUNA = False

pytestmark = pytest.mark.skipif(
    not HAS_OPTUNA,
    reason="optuna not installed (optional ML dependency)",
)


@pytest.fixture
def service():
    """Create a TrajectoryPredictionService instance."""
    from app.services.trajectory_prediction import TrajectoryPredictionService
    return TrajectoryPredictionService()


@pytest.fixture
def sample_health_data_points():
    """Create sample HealthDataPoint objects for testing."""
    from app.models.health import HealthDataPoint

    base_date = datetime(2025, 1, 1)
    points = []
    for i in range(7):
        points.append(HealthDataPoint(
            recorded_at=base_date + timedelta(days=i),
            data_source="self_report",
            confidence_score=0.8,
            symptom_severity={
                "headache": float(3 + i * 0.5),
                "fatigue": float(4 + i * 0.3),
            },
            vital_signs={
                "heart_rate": 70 + i,
                "blood_pressure_systolic": 120 + i * 2,
            },
            lab_values=None,
            lifestyle_factors={
                "sleep_hours": 7.0 - i * 0.2,
                "exercise_minutes": max(0, 30 - i * 3),
            },
        ))
    return points


class TestTrajectoryPrediction:
    """Test suite for health trajectory prediction."""

    @pytest.mark.unit
    def test_health_point_to_dict(self, service, sample_health_data_points):
        """Test HealthDataPoint to dictionary conversion."""
        point = sample_health_data_points[0]
        result = service._health_point_to_dict(point)

        assert result["recorded_at"] == point.recorded_at
        assert result["data_source"] == "self_report"
        assert result["confidence_score"] == 0.8
        # Symptom severity merged at top level
        assert result["headache"] == 3.0
        assert result["fatigue"] == 4.0
        # Vital signs prefixed
        assert result["vital_heart_rate"] == 70
        # Lifestyle prefixed
        assert result["lifestyle_sleep_hours"] == 7.0

    @pytest.mark.unit
    def test_health_point_to_dict_no_optionals(self, service):
        """Test conversion when optional fields are None."""
        from app.models.health import HealthDataPoint

        point = HealthDataPoint(
            recorded_at=datetime(2025, 1, 1),
            data_source="device",
            confidence_score=0.9,
            symptom_severity=None,
            vital_signs=None,
            lab_values=None,
            lifestyle_factors=None,
        )
        result = service._health_point_to_dict(point)

        assert result["recorded_at"] == point.recorded_at
        assert result["data_source"] == "device"
        assert result["confidence_score"] == 0.9
        # Should only have the 3 base keys
        assert len(result) == 3

    @pytest.mark.unit
    def test_prepare_time_series_data(self, service, sample_health_data_points):
        """Test time-series DataFrame preparation from health data."""
        df = service._prepare_time_series_data(sample_health_data_points)

        assert isinstance(df, pd.DataFrame)
        assert len(df) == 7
        assert df.index.name == "timestamp"
        # Should have symptom columns
        symptom_cols = [c for c in df.columns if c.startswith("symptom_")]
        assert len(symptom_cols) > 0

    @pytest.mark.unit
    def test_infer_primary_condition_headache(self, service):
        """Test condition inference with headache as primary symptom."""
        df = pd.DataFrame({
            "symptom_headache": [5.0, 6.0, 7.0, 8.0],
            "symptom_fatigue": [2.0, 2.0, 3.0, 2.0],
        }, index=pd.date_range("2025-01-01", periods=4, freq="D", name="timestamp"))

        condition = service._infer_primary_condition(df)
        assert condition == "Migraine/Headache Disorder"

    @pytest.mark.unit
    def test_infer_primary_condition_no_symptoms(self, service):
        """Test condition inference defaults when no symptom columns exist."""
        df = pd.DataFrame({
            "heart_rate": [70, 72, 75],
        }, index=pd.date_range("2025-01-01", periods=3, freq="D", name="timestamp"))

        condition = service._infer_primary_condition(df)
        assert condition == "General Health Monitoring"

    @pytest.mark.unit
    def test_create_baseline_prediction(self, service):
        """Test baseline prediction generation for insufficient data."""
        df = pd.DataFrame({
            "symptom_headache": [5.0, 6.0],
        }, index=pd.date_range("2025-01-01", periods=2, freq="D", name="timestamp"))

        result = service._create_baseline_prediction(df, horizon_days=7)

        assert len(result.values) == 7
        assert len(result.lower_bound) == 7
        assert len(result.upper_bound) == 7
        assert result.confidence_score == 0.3  # Low confidence for baseline
        # Lower bound should be <= values
        assert np.all(result.lower_bound <= result.values)
        # Upper bound should be >= values
        assert np.all(result.upper_bound >= result.values)

    @pytest.mark.unit
    def test_confidence_interval_bounds(self, service):
        """Test confidence intervals are properly bounded."""
        predictions = np.array([5.0, 6.0, 7.0, 8.0, 9.0])
        historical = pd.Series([4.0, 5.0, 6.0, 7.0, 8.0])

        intervals = service._calculate_confidence_intervals(predictions, historical)

        assert "lower" in intervals
        assert "upper" in intervals
        assert len(intervals["lower"]) == len(predictions)
        assert len(intervals["upper"]) == len(predictions)
        # Lower should be less than or equal to predictions
        assert np.all(intervals["lower"] <= predictions)
        # Upper should be greater than or equal to predictions
        assert np.all(intervals["upper"] >= predictions)

    @pytest.mark.unit
    def test_predict_trajectory_insufficient_data(self, service):
        """Test prediction raises ValueError with < 3 data points."""
        from app.models.health import HealthDataPoint

        points = [
            HealthDataPoint(
                recorded_at=datetime(2025, 1, 1),
                data_source="self_report",
                confidence_score=0.8,
                symptom_severity={"headache": 5.0},
            ),
        ]

        # Should fall back (not raise) — the service catches ValueError internally
        result = service.predict_trajectory(points, prediction_horizon_days=7)

        # Fallback should still produce a valid TrajectoryPrediction
        assert result is not None
        assert result.prediction_horizon_days == 7

    @pytest.mark.unit
    def test_predict_trajectory_with_data(self, service, sample_health_data_points):
        """Test full prediction pipeline with sufficient data."""
        with patch(
            'app.services.trajectory_prediction.advanced_predictor'
        ) as mock_predictor:
            # Mock the advanced predictor response
            mock_result = MagicMock()
            mock_result.model_uncertainty = 0.2
            mock_result.feature_importance = {"headache": 0.6, "fatigue": 0.4}
            mock_result.predicted_values = [
                {"day": i, "predicted_value": 5.0 + i * 0.1}
                for i in range(7)
            ]
            mock_predictor.predict_trajectory.return_value = mock_result

            result = service.predict_trajectory(
                sample_health_data_points,
                prediction_horizon_days=7,
                condition_focus="Migraine/Headache Disorder",
            )

            assert result is not None
            assert result.prediction_horizon_days == 7
            assert result.confidence_score == pytest.approx(0.8, abs=0.01)

    @pytest.mark.unit
    def test_select_target_variable_known(self, service):
        """Test target variable selection for known conditions."""
        df = pd.DataFrame({
            "symptom_headache": [5.0, 6.0],
            "symptom_fatigue": [3.0, 4.0],
        })

        target = service._select_target_variable(df, "Migraine/Headache Disorder")
        assert target == "symptom_headache"

    @pytest.mark.unit
    def test_select_target_variable_fallback(self, service):
        """Test target variable falls back to first available symptom column."""
        df = pd.DataFrame({
            "symptom_anxiety": [5.0, 6.0],
            "heart_rate": [70, 72],
        })

        target = service._select_target_variable(df, "Unknown Condition")
        assert target == "symptom_anxiety"

    @pytest.mark.unit
    def test_feature_importance_calculation(self, service, sample_health_data_points):
        """Test feature importance extraction from data."""
        df = service._prepare_time_series_data(sample_health_data_points)
        importance = service._calculate_feature_importance(df)

        assert isinstance(importance, dict)
        # Should have entries for features in the data
        assert len(importance) > 0
        # All importance values should be non-negative
        assert all(v >= 0 for v in importance.values())
