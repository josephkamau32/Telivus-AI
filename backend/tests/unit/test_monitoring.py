"""
Unit Tests for Monitoring Module (Sentry Integration)

Tests the Sentry initialization and error tracking setup.
"""

import pytest
from unittest.mock import patch, MagicMock


class TestSentryInitialization:
    """Tests for Sentry SDK initialization."""

    @pytest.mark.unit
    def test_init_sentry_without_dsn_logs_warning(self) -> None:
        from app.core.monitoring import init_sentry
        # Should not raise — just logs a warning
        init_sentry(dsn=None)

    @pytest.mark.unit
    def test_init_sentry_with_empty_dsn(self) -> None:
        from app.core.monitoring import init_sentry
        init_sentry(dsn="")

    @pytest.mark.unit
    @patch("app.core.monitoring.sentry_sdk")
    def test_init_sentry_with_dsn_calls_sdk(self, mock_sdk: MagicMock) -> None:
        from app.core.monitoring import init_sentry
        init_sentry(dsn="https://test@sentry.io/123", environment="test")
        mock_sdk.init.assert_called_once()

    @pytest.mark.unit
    @patch("app.core.monitoring.sentry_sdk")
    def test_init_sentry_passes_environment(self, mock_sdk: MagicMock) -> None:
        from app.core.monitoring import init_sentry
        init_sentry(dsn="https://test@sentry.io/123", environment="staging")
        call_kwargs = mock_sdk.init.call_args[1]
        assert call_kwargs["environment"] == "staging"

    @pytest.mark.unit
    @patch("app.core.monitoring.sentry_sdk")
    def test_init_sentry_passes_traces_rate(self, mock_sdk: MagicMock) -> None:
        from app.core.monitoring import init_sentry
        init_sentry(dsn="https://test@sentry.io/123", traces_sample_rate=0.5)
        call_kwargs = mock_sdk.init.call_args[1]
        assert call_kwargs["traces_sample_rate"] == 0.5
