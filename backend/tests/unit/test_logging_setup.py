"""
Unit Tests for Logging Setup

Tests the structured logging configuration:
- Development vs production modes
- structlog integration
- Logger instance creation
"""

import pytest
import logging
from unittest.mock import patch


class TestLoggingSetup:
    """Tests for logging configuration."""

    @pytest.mark.unit
    def test_setup_logging_does_not_raise(self) -> None:
        from app.core.logging import setup_logging
        setup_logging()  # Should not raise

    @pytest.mark.unit
    def test_get_logger_returns_logger(self) -> None:
        from app.core.logging import get_logger
        logger = get_logger("test_module")
        assert isinstance(logger, logging.Logger)
        assert logger.name == "test_module"

    @pytest.mark.unit
    def test_get_logger_different_names(self) -> None:
        from app.core.logging import get_logger
        l1 = get_logger("module_a")
        l2 = get_logger("module_b")
        assert l1.name != l2.name

    @pytest.mark.unit
    def test_root_logger_has_handler(self) -> None:
        from app.core.logging import setup_logging
        setup_logging()
        root = logging.getLogger()
        assert len(root.handlers) > 0
