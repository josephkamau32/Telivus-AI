"""
Adversarial Authentication and Security Tests for Health Endpoints (C-05 Remediation)

Proves that:
1. Health assessment endpoints (/assess, /symptoms/suggestions, /validate-symptoms) reject unauthenticated requests.
2. Emergency symptom check (/emergency-check) remains public.
3. Authenticated requests with valid Supabase token are permitted.
4. Rate limiting middleware adds rate limit headers to responses.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.auth import SupabaseUser, get_current_user
from app.main import app


USER_TEST = SupabaseUser(
    user_id="33333333-3333-3333-3333-333333333333",
    email="patient@example.com",
    role="authenticated",
)


@pytest.fixture
def unauthenticated_client():
    """Client without authentication override."""
    app.dependency_overrides.pop(get_current_user, None)
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def authenticated_client():
    """Client with authentication override."""
    app.dependency_overrides[get_current_user] = lambda: USER_TEST
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.pop(get_current_user, None)


# ---------------------------------------------------------------------------
# 1. Unauthenticated Rejection Tests
# ---------------------------------------------------------------------------

class TestHealthUnauthenticatedRejection:
    """Assessment endpoints must reject unauthenticated requests."""

    def test_assess_rejects_unauthenticated(self, unauthenticated_client):
        """POST /api/v1/health/assess requires authentication."""
        payload = {
            "patient_info": {
                "age": 30,
                "gender": "male",
            },
            "symptoms": {
                "reported_symptoms": ["headache", "fever"],
                "duration": "2 days",
                "severity": 5,
            },
        }
        response = unauthenticated_client.post("/api/v1/health/assess", json=payload)
        assert response.status_code in (401, 403)

    def test_symptom_suggestions_rejects_unauthenticated(self, unauthenticated_client):
        """GET /api/v1/health/symptoms/suggestions requires authentication."""
        response = unauthenticated_client.get(
            "/api/v1/health/symptoms/suggestions?symptoms=fever&age=25"
        )
        assert response.status_code in (401, 403)

    def test_validate_symptoms_rejects_unauthenticated(self, unauthenticated_client):
        """POST /api/v1/health/validate-symptoms requires authentication."""
        payload = {
            "reported_symptoms": ["cough"],
            "duration": "1 day",
            "severity": 2,
        }
        response = unauthenticated_client.post(
            "/api/v1/health/validate-symptoms", json=payload
        )
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# 2. Public Emergency Check Test
# ---------------------------------------------------------------------------

class TestEmergencyCheckPublic:
    """Emergency check remains public for urgent medical triage."""

    @patch("app.api.v1.endpoints.health.HealthAssessmentService")
    def test_emergency_check_accessible_unauthenticated(
        self, mock_service_cls, unauthenticated_client
    ):
        """GET /api/v1/health/emergency-check is accessible without credentials."""
        mock_service = MagicMock()
        mock_service.assess_emergency = AsyncMock(
            return_value={
                "is_emergency": False,
                "urgency_level": "routine",
                "recommendation": "Monitor symptoms",
            }
        )
        mock_service_cls.return_value = mock_service

        response = unauthenticated_client.get(
            "/api/v1/health/emergency-check?symptoms=mild_headache&age=30"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_emergency"] is False


# ---------------------------------------------------------------------------
# 3. Authenticated Assessment Test
# ---------------------------------------------------------------------------

class TestHealthAuthenticatedSuccess:
    """Authenticated callers with valid token can access health assessments."""

    @patch("app.api.v1.endpoints.health.HealthAssessmentService")
    def test_symptom_suggestions_authenticated(
        self, mock_service_cls, authenticated_client
    ):
        """Authenticated GET /api/v1/health/symptoms/suggestions succeeds."""
        mock_service = MagicMock()
        mock_service.get_symptom_suggestions = AsyncMock(
            return_value=["chills", "body aches"]
        )
        mock_service_cls.return_value = mock_service

        response = authenticated_client.get(
            "/api/v1/health/symptoms/suggestions?symptoms=fever&age=25"
        )
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "chills" in data["suggestions"]


# ---------------------------------------------------------------------------
# 4. Rate Limiter Headers Test
# ---------------------------------------------------------------------------

class TestRateLimiterMiddleware:
    """Responses should include standard rate limiting headers."""

    def test_rate_limit_headers_present(self, unauthenticated_client):
        """Requests receive X-RateLimit headers."""
        response = unauthenticated_client.get(
            "/api/v1/health/emergency-check?symptoms=fever&age=25"
        )
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
