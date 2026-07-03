"""
Unit Tests for Database Module

Tests database utilities with mocked engine/session:
- Base class existence
- Connection check responses
- Table creation retry logic
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock


class TestDatabaseBase:
    """Tests for database base configuration."""

    @pytest.mark.unit
    def test_base_class_exists(self) -> None:
        from app.core.database import Base
        assert Base is not None

    @pytest.mark.unit
    def test_connect_args_has_timeouts(self) -> None:
        from app.core.database import connect_args
        assert "timeout" in connect_args
        assert "command_timeout" in connect_args
        assert connect_args["timeout"] == 10
        assert connect_args["command_timeout"] == 30


class TestCheckDatabaseConnection:
    """Tests for check_database_connection."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_returns_dict_when_no_engine(self) -> None:
        from app.core.database import check_database_connection
        with patch("app.core.database.engine", None):
            result = await check_database_connection()
            assert result["connected"] is False
            assert "not initialized" in result["error"]

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_returns_error_on_exception(self) -> None:
        from app.core.database import check_database_connection
        mock_engine = MagicMock()
        mock_engine.begin = MagicMock(side_effect=Exception("Connection refused"))
        with patch("app.core.database.engine", mock_engine):
            result = await check_database_connection()
            assert result["connected"] is False


class TestCreateTables:
    """Tests for create_tables retry logic."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_create_tables_skips_without_engine(self) -> None:
        from app.core.database import create_tables
        with patch("app.core.database.engine", None):
            # Should not raise, just log and return
            await create_tables()
