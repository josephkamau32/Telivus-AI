"""
Unit Tests for Core Configuration

Tests the Settings class and environment variable parsing:
- Default values
- Environment variable overrides
- Validators (DEBUG, CORS)
- Feature flags
"""

import pytest
import os


class TestSettings:
    """Tests for application configuration."""

    @pytest.mark.unit
    def test_default_api_prefix(self) -> None:
        from app.core.config import settings
        assert settings.API_V1_STR == "/api/v1"

    @pytest.mark.unit
    def test_default_openai_model(self) -> None:
        from app.core.config import settings
        assert settings.OPENAI_MODEL == "gpt-4o-mini"

    @pytest.mark.unit
    def test_default_embedding_model(self) -> None:
        from app.core.config import settings
        assert settings.OPENAI_EMBEDDING_MODEL == "text-embedding-3-small"

    @pytest.mark.unit
    def test_debug_flag_parsed(self) -> None:
        from app.core.config import settings
        # In test env, DEBUG should be True (set in conftest.py)
        assert isinstance(settings.DEBUG, bool)

    @pytest.mark.unit
    def test_default_rate_limit(self) -> None:
        from app.core.config import settings
        assert settings.RATE_LIMIT_REQUESTS == 100
        assert settings.RATE_LIMIT_WINDOW == 60

    @pytest.mark.unit
    def test_default_medical_kb_settings(self) -> None:
        from app.core.config import settings
        assert settings.MEDICAL_KB_CHUNK_SIZE == 1000
        assert settings.MEDICAL_KB_CHUNK_OVERLAP == 200
        assert settings.MEDICAL_KB_TOP_K == 5

    @pytest.mark.unit
    def test_feature_flags_defaults(self) -> None:
        from app.core.config import settings
        assert settings.ENABLE_AI_AGENTS is True
        assert settings.ENABLE_RAG is True

    @pytest.mark.unit
    def test_vector_db_type_default(self) -> None:
        from app.core.config import settings
        assert settings.VECTOR_DB_TYPE == "chroma"

    @pytest.mark.unit
    def test_langfuse_host_default(self) -> None:
        from app.core.config import settings
        assert settings.LANGFUSE_HOST == "https://cloud.langfuse.com"

    @pytest.mark.unit
    def test_cors_origins_is_list(self) -> None:
        from app.core.config import settings
        assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
        assert len(settings.BACKEND_CORS_ORIGINS) > 0

    @pytest.mark.unit
    def test_allowed_hosts_is_list(self) -> None:
        from app.core.config import settings
        assert isinstance(settings.ALLOWED_HOSTS, list)
        assert "localhost" in settings.ALLOWED_HOSTS

    @pytest.mark.unit
    def test_log_level_default(self) -> None:
        from app.core.config import settings
        assert settings.LOG_LEVEL == "INFO"

    @pytest.mark.unit
    def test_server_name(self) -> None:
        from app.core.config import settings
        assert "Telivus" in settings.SERVER_NAME


class TestDebugParser:
    """Tests for DEBUG field_validator edge cases."""

    @pytest.mark.unit
    def test_parse_debug_true_string(self) -> None:
        from app.core.config import Settings
        assert Settings.parse_debug("true") is True
        assert Settings.parse_debug("True") is True
        assert Settings.parse_debug("1") is True
        assert Settings.parse_debug("yes") is True

    @pytest.mark.unit
    def test_parse_debug_false_string(self) -> None:
        from app.core.config import Settings
        assert Settings.parse_debug("false") is False
        assert Settings.parse_debug("0") is False
        assert Settings.parse_debug("no") is False

    @pytest.mark.unit
    def test_parse_debug_bool(self) -> None:
        from app.core.config import Settings
        assert Settings.parse_debug(True) is True
        assert Settings.parse_debug(False) is False

    @pytest.mark.unit
    def test_parse_debug_other_types(self) -> None:
        from app.core.config import Settings
        assert Settings.parse_debug(0) is False
