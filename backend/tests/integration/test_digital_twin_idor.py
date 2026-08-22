"""
Adversarial IDOR & Authentication Tests for Digital Twin Endpoints (C-01 Remediation)

Proves that:
1. All Digital Twin endpoints reject requests without a valid Supabase JWT (401/403).
2. Endpoint user context is strictly derived from the verified token's `sub` claim.
3. Attacker cannot access or modify another user's twin by injecting `?user_id=victim`
   or passing foreign identifiers in request bodies.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.auth import SupabaseUser, get_current_user
from app.main import app


# Test users
USER_ALICE = SupabaseUser(
    user_id="11111111-1111-1111-1111-111111111111",
    email="alice@example.com",
    role="authenticated",
)

USER_BOB = SupabaseUser(
    user_id="22222222-2222-2222-2222-222222222222",
    email="bob@example.com",
    role="authenticated",
)


@pytest.fixture
def unauthenticated_client():
    """Client without any authentication override."""
    # Ensure get_current_user is not overridden
    app.dependency_overrides.pop(get_current_user, None)
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def alice_client():
    """Client authenticated as Alice."""
    app.dependency_overrides[get_current_user] = lambda: USER_ALICE
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def bob_client():
    """Client authenticated as Bob."""
    app.dependency_overrides[get_current_user] = lambda: USER_BOB
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.pop(get_current_user, None)


# ---------------------------------------------------------------------------
# 1. Unauthenticated Rejection Tests
# ---------------------------------------------------------------------------

class TestUnauthenticatedRejection:
    """All twin endpoints MUST reject unauthenticated requests."""

    @pytest.mark.parametrize(
        "method,path,payload",
        [
            ("GET", "/api/v1/twin/me", None),
            ("GET", "/api/v1/twin/stats", None),
            ("PUT", "/api/v1/twin/update", {"twin_name": "Hacked Twin"}),
            ("POST", "/api/v1/twin/events", {"event_type": "symptom", "category": "pain"}),
            ("GET", "/api/v1/twin/timeline", None),
            ("GET", "/api/v1/twin/patterns", None),
            ("GET", "/api/v1/twin/alerts", None),
            ("POST", "/api/v1/twin/alerts/alert-123/acknowledge", None),
            ("GET", "/api/v1/twin/insights", None),
            ("POST", "/api/v1/twin/sync", None),
            ("POST", "/api/v1/twin/learn", None),
        ],
    )
    def test_endpoint_rejects_unauthenticated(self, unauthenticated_client, method, path, payload):
        """Unauthenticated requests must receive 401 or 403."""
        if method == "GET":
            response = unauthenticated_client.get(path)
        elif method == "POST":
            response = unauthenticated_client.post(path, json=payload or {})
        elif method == "PUT":
            response = unauthenticated_client.put(path, json=payload or {})

        assert response.status_code in (401, 403), f"Endpoint {method} {path} allowed unauthenticated access! Status: {response.status_code}"


# ---------------------------------------------------------------------------
# 2. IDOR Prevention Tests
# ---------------------------------------------------------------------------

class TestIDORPrevention:
    """Proves user context is strictly bound to token sub and cannot be overridden."""

    @patch("app.api.v1.endpoints.digital_twin.DigitalTwinService")
    def test_get_my_twin_uses_token_user_id(self, mock_service_cls, alice_client):
        """Twin retrieved is strictly for Alice, even if an attacker passes ?user_id=bob."""
        mock_service = MagicMock()
        mock_twin = MagicMock()
        mock_twin.id = "twin-alice-1"
        mock_twin.user_id = USER_ALICE.user_id
        mock_twin.twin_name = "Alice Twin"
        mock_twin.learning_level = "intermediate"
        mock_twin.data_points_count = 10
        mock_twin.interaction_count = 5
        mock_twin.accuracy_score = 92.5
        mock_twin.confidence_level = 88.0
        mock_twin.created_at = datetime.now(timezone.utc)
        mock_twin.last_learning_update = None

        mock_service.get_or_create_twin = AsyncMock(return_value=mock_twin)
        mock_service_cls.return_value = mock_service

        # Attacker Alice attempts to supply Bob's ID in query params
        response = alice_client.get(f"/api/v1/twin/me?user_id={USER_BOB.user_id}")

        assert response.status_code == 200
        # Service must have been called with Alice's ID, NOT Bob's ID
        mock_service.get_or_create_twin.assert_called_once_with(USER_ALICE.user_id)
        data = response.json()
        assert data["user_id"] == USER_ALICE.user_id

    @patch("app.api.v1.endpoints.digital_twin.DigitalTwinService")
    def test_record_health_event_binds_to_authenticated_user(self, mock_service_cls, alice_client):
        """Health event is created under Alice's twin, ignoring any injected user_id."""
        mock_service = MagicMock()
        mock_twin = MagicMock()
        mock_twin.id = "twin-alice-1"
        mock_service.get_or_create_twin = AsyncMock(return_value=mock_twin)

        mock_event = MagicMock()
        mock_event.id = "event-1"
        mock_event.event_type = "symptom"
        mock_event.event_date = datetime.now(timezone.utc)
        mock_event.symptoms = {"headache": "mild"}
        mock_event.severity = 3
        mock_event.feeling_state = "tired"
        mock_service.record_health_event = AsyncMock(return_value=mock_event)
        mock_service_cls.return_value = mock_service

        payload = {
            "event_type": "symptom",
            "category": "neurological",
            "symptoms": {"headache": "mild"},
            "severity": 3,
            "feeling_state": "tired",
            "user_id": USER_BOB.user_id,  # Injection attempt
        }

        response = alice_client.post(f"/api/v1/twin/events?user_id={USER_BOB.user_id}", json=payload)

        assert response.status_code == 200
        # Verified that twin queried was Alice's
        mock_service.get_or_create_twin.assert_called_once_with(USER_ALICE.user_id)
        mock_service.record_health_event.assert_called_once()
        assert mock_service.record_health_event.call_args[0][0] == "twin-alice-1"

    @patch("app.api.v1.endpoints.digital_twin.DigitalTwinService")
    def test_timeline_isolated_between_users(self, mock_service_cls):
        """Alice and Bob get their own isolated timelines."""
        mock_service = MagicMock()

        async def fake_get_or_create_twin(uid):
            twin = MagicMock()
            twin.id = f"twin-{uid}"
            return twin

        async def fake_get_timeline(twin_id, limit, offset):
            event = MagicMock()
            event.id = f"event-for-{twin_id}"
            event.event_type = "vital_sign"
            event.event_date = datetime.now(timezone.utc)
            event.symptoms = None
            event.severity = 1
            event.feeling_state = "ok"
            return [event]

        mock_service.get_or_create_twin = AsyncMock(side_effect=fake_get_or_create_twin)
        mock_service.get_timeline = AsyncMock(side_effect=fake_get_timeline)
        mock_service_cls.return_value = mock_service

        client = TestClient(app, raise_server_exceptions=False)

        app.dependency_overrides[get_current_user] = lambda: USER_ALICE
        resp_alice = client.get("/api/v1/twin/timeline")

        app.dependency_overrides[get_current_user] = lambda: USER_BOB
        resp_bob = client.get("/api/v1/twin/timeline")

        app.dependency_overrides.pop(get_current_user, None)

        assert resp_alice.status_code == 200
        assert resp_bob.status_code == 200
        assert resp_alice.json()[0]["id"] == f"event-for-twin-{USER_ALICE.user_id}"
        assert resp_bob.json()[0]["id"] == f"event-for-twin-{USER_BOB.user_id}"

