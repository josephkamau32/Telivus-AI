"""
Unit Tests for Alert Service

Tests the AlertService class including:
- Default rule generation
- Alert deduplication
- Severity calculation via rule evaluation
- Alert acknowledgment
- Alert analytics retrieval
"""

from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Guard against missing ML dependencies (alert_service -> trajectory_prediction -> optuna)
try:
    import optuna  # noqa: F401
    HAS_OPTUNA = True
except ImportError:
    HAS_OPTUNA = False

pytestmark = pytest.mark.skipif(
    not HAS_OPTUNA,
    reason="optuna not installed (optional ML dependency for trajectory prediction)",
)


@pytest.fixture
def alert_service():
    """Create an AlertService instance."""
    from app.services.alert_service import AlertService
    return AlertService()


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = []
    db.query.return_value.filter.return_value.first.return_value = None
    return db


class TestAlertService:
    """Test suite for predictive alert system."""

    @pytest.mark.unit
    def test_default_alert_rules(self, alert_service):
        """Test that default alert rules are generated on init."""
        rules = alert_service.default_rules
        assert isinstance(rules, list)
        assert len(rules) > 0

        # Check all required rule types exist
        rule_types = {r["alert_type"] for r in rules}
        assert "symptom_worsening" in rule_types
        assert "risk_level_increase" in rule_types
        assert "emergency_warning" in rule_types
        assert "preventive_action" in rule_types

    @pytest.mark.unit
    def test_default_rule_structure(self, alert_service):
        """Test that each default rule has the required fields."""
        required_keys = {
            "alert_type", "metric_name", "operator",
            "threshold_value", "severity", "time_window_days", "cooldown_hours",
        }
        for rule in alert_service.default_rules:
            assert required_keys.issubset(rule.keys()), (
                f"Rule {rule.get('alert_type')} missing keys: "
                f"{required_keys - rule.keys()}"
            )

    @pytest.mark.unit
    def test_alert_severity_levels(self, alert_service):
        """Test that severity levels are valid across all default rules."""
        valid_severities = {"low", "medium", "high", "critical"}
        for rule in alert_service.default_rules:
            assert rule["severity"] in valid_severities

    @pytest.mark.unit
    def test_alert_deduplication(self, alert_service):
        """Test that duplicate alerts are removed."""
        from app.models.health import AlertSeverity, AlertType
        from app.models.health import PredictiveAlert as AlertModel

        base_time = datetime.utcnow()

        # Create duplicate alerts (same type, user, condition)
        alerts = [
            AlertModel(
                alert_id="alert_1",
                user_id="user_123",
                alert_type=AlertType.SYMPTOM_WORSENING,
                severity=AlertSeverity.HIGH,
                title="Symptom Worsening Detected",
                message="Test alert 1",
                condition_name="Headache",
                predicted_value=7.5,
                threshold_value=7.0,
                confidence_score=0.85,
            ),
            AlertModel(
                alert_id="alert_2",
                user_id="user_123",
                alert_type=AlertType.SYMPTOM_WORSENING,
                severity=AlertSeverity.HIGH,
                title="Symptom Worsening Detected",
                message="Test alert 2",
                condition_name="Headache",
                predicted_value=7.8,
                threshold_value=7.0,
                confidence_score=0.9,
            ),
            AlertModel(
                alert_id="alert_3",
                user_id="user_123",
                alert_type=AlertType.RISK_LEVEL_INCREASE,
                severity=AlertSeverity.CRITICAL,
                title="Risk Elevated",
                message="Different type",
                condition_name="Diabetes",
                predicted_value=0.9,
                threshold_value=0.8,
                confidence_score=0.88,
            ),
        ]

        deduped = alert_service._deduplicate_alerts(alerts)

        # Should keep one symptom_worsening and one risk_level_increase
        assert len(deduped) == 2
        types = {a.alert_type for a in deduped}
        assert AlertType.SYMPTOM_WORSENING in types
        assert AlertType.RISK_LEVEL_INCREASE in types

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_generate_alerts_no_trajectory(self, alert_service, mock_db):
        """Test alert generation returns empty when no trajectory data."""
        with patch.object(
            alert_service, '_create_default_rules_for_user', return_value=[]
        ):
            with patch(
                'app.services.alert_service.trajectory_service_instance'
            ) as mock_traj:
                mock_traj.get_trajectory_history = AsyncMock(return_value=[])

                alerts = await alert_service.generate_alerts_for_user(
                    "user_123", mock_db
                )
                assert alerts == []

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_acknowledge_alert_not_found(self, alert_service, mock_db):
        """Test acknowledging a non-existent alert raises ValueError."""
        from app.models.health import AlertAcknowledgeRequest

        mock_db.query.return_value.filter.return_value.first.return_value = None

        request = AlertAcknowledgeRequest(
            alert_id="nonexistent_alert",
            user_id="user_123",
        )

        with pytest.raises(ValueError, match="not found"):
            await alert_service.acknowledge_alert(request, mock_db)

    @pytest.mark.unit
    def test_calculate_trend_increasing(self, alert_service):
        """Test trend calculation detects increasing values."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        trend = alert_service._calculate_trend(values)
        assert trend > 0, "Increasing values should produce positive trend"

    @pytest.mark.unit
    def test_calculate_trend_decreasing(self, alert_service):
        """Test trend calculation detects decreasing values."""
        values = [5.0, 4.0, 3.0, 2.0, 1.0]
        trend = alert_service._calculate_trend(values)
        assert trend < 0, "Decreasing values should produce negative trend"

    @pytest.mark.unit
    def test_calculate_trend_stable(self, alert_service):
        """Test trend calculation detects stable values."""
        values = [3.0, 3.0, 3.0, 3.0, 3.0]
        trend = alert_service._calculate_trend(values)
        assert abs(trend) < 0.01, "Stable values should produce near-zero trend"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_check_symptom_worsening_triggered(self, alert_service):
        """Test symptom worsening alert triggers on upward trend above threshold."""
        mock_rule = MagicMock()
        mock_rule.threshold_value = 5.0
        mock_rule.severity = "high"

        trajectory = {
            "predicted_values": [
                {"predicted_value": v} for v in [4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
            ],
            "condition_name": "Migraine",
            "confidence_score": 0.85,
        }

        alert = await alert_service._check_symptom_worsening(
            mock_rule, trajectory, "user_123"
        )

        assert alert is not None
        assert alert.alert_type.value == "symptom_worsening"
        assert alert.user_id == "user_123"

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_check_symptom_worsening_not_triggered(self, alert_service):
        """Test symptom worsening alert does NOT trigger on stable values below threshold."""
        mock_rule = MagicMock()
        mock_rule.threshold_value = 7.0
        mock_rule.severity = "high"

        trajectory = {
            "predicted_values": [
                {"predicted_value": v} for v in [2.0, 2.1, 2.0, 1.9, 2.0, 2.1, 2.0]
            ],
            "condition_name": "Migraine",
            "confidence_score": 0.85,
        }

        alert = await alert_service._check_symptom_worsening(
            mock_rule, trajectory, "user_123"
        )

        assert alert is None
