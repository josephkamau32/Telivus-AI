"""
Adversarial tests for Supabase JWT (ES256/JWKS) authentication.

Proves that the auth system correctly:
- Rejects unauthenticated requests
- Rejects invalid/expired/wrong-issuer/wrong-audience tokens
- Extracts user_id from valid tokens
- Handles JWKS key rotation (kid-miss refresh)
"""

import json
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from jose import jwt as jose_jwt

from app.core.auth import (
    JWKSCache,
    SupabaseUser,
    get_current_user,
    verify_supabase_jwt,
    _reset_jwks_cache,
)


# ---------------------------------------------------------------------------
# Test key pair generation — ES256 (P-256)
# ---------------------------------------------------------------------------

def _generate_ec_key_pair():
    """Generate a fresh EC P-256 key pair for testing."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    return private_key


def _private_key_to_pem(private_key) -> bytes:
    """Export private key to PEM bytes."""
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


def _public_key_to_jwk(private_key, kid: str = "test-kid-1") -> dict:
    """Convert an EC public key to JWK format for JWKS mock."""
    public_key = private_key.public_key()
    public_numbers = public_key.public_numbers()

    # Encode x and y coordinates as base64url
    import base64
    x_bytes = public_numbers.x.to_bytes(32, byteorder="big")
    y_bytes = public_numbers.y.to_bytes(32, byteorder="big")

    return {
        "kty": "EC",
        "crv": "P-256",
        "x": base64.urlsafe_b64encode(x_bytes).rstrip(b"=").decode(),
        "y": base64.urlsafe_b64encode(y_bytes).rstrip(b"=").decode(),
        "kid": kid,
        "alg": "ES256",
        "use": "sig",
    }


def _sign_jwt(private_key, claims: dict, kid: str = "test-kid-1") -> str:
    """Sign a JWT with the given EC private key."""
    pem = _private_key_to_pem(private_key)
    headers = {"kid": kid, "alg": "ES256"}
    return jose_jwt.encode(claims, pem, algorithm="ES256", headers=headers)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_cache():
    """Reset JWKS cache before each test."""
    _reset_jwks_cache()
    yield
    _reset_jwks_cache()


@pytest.fixture
def ec_key():
    """Generate a fresh EC key pair for testing."""
    return _generate_ec_key_pair()


@pytest.fixture
def ec_key_jwk(ec_key):
    """The public key as a JWK dict."""
    return _public_key_to_jwk(ec_key, kid="test-kid-1")


@pytest.fixture
def valid_claims():
    """Standard valid JWT claims mimicking a Supabase token."""
    now = datetime.now(timezone.utc)
    return {
        "sub": "550e8400-e29b-41d4-a716-446655440000",
        "email": "testuser@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "iss": "https://lhrbmfpsjahwxgdylmar.supabase.co/auth/v1",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }


@pytest.fixture
def mock_settings():
    """Mock settings for auth tests."""
    settings = MagicMock()
    settings.SUPABASE_JWKS_URL = "https://test.supabase.co/auth/v1/.well-known/jwks.json"
    settings.SUPABASE_JWT_ISSUER = "https://lhrbmfpsjahwxgdylmar.supabase.co/auth/v1"
    settings.SUPABASE_JWT_AUDIENCE = "authenticated"
    settings.SUPABASE_URL = "https://lhrbmfpsjahwxgdylmar.supabase.co"
    return settings


@pytest.fixture
def mock_jwks_response(ec_key_jwk):
    """Mock JWKS HTTP response."""
    return {"keys": [ec_key_jwk]}


@pytest.fixture
def patched_auth(mock_settings, mock_jwks_response):
    """Patch settings and JWKS fetch for auth tests."""
    with patch("app.core.auth.requests.get") as mock_get, \
         patch("app.core.config.settings", mock_settings):
        mock_response = MagicMock()
        mock_response.json.return_value = mock_jwks_response
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response
        yield mock_get


@pytest.fixture
def test_app():
    """Create a minimal FastAPI app with a protected endpoint."""
    app = FastAPI()

    @app.get("/protected")
    async def protected_route(user: SupabaseUser = Depends(get_current_user)):
        return {"user_id": user.user_id, "email": user.email, "role": user.role}

    return app


# ---------------------------------------------------------------------------
# Tests: Token Rejection
# ---------------------------------------------------------------------------

class TestNoToken:
    """Requests without an Authorization header must be rejected."""

    def test_no_token_returns_401(self, test_app):
        """Request without Authorization header → 401."""
        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get("/protected")
        assert response.status_code == 401 or response.status_code == 403


class TestInvalidToken:
    """Invalid tokens must be rejected."""

    def test_garbage_token_returns_401(self, test_app, patched_auth):
        """Garbage string as Bearer token → 401."""
        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer not-a-jwt-at-all"},
        )
        assert response.status_code == 401

    def test_empty_bearer_returns_401(self, test_app):
        """Empty Bearer value → 401/403."""
        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer "},
        )
        assert response.status_code in (401, 403, 422)


class TestExpiredToken:
    """Expired tokens must be rejected."""

    def test_expired_token_rejected(self, ec_key, patched_auth, test_app):
        """JWT with exp in the past → 401."""
        now = datetime.now(timezone.utc)
        claims = {
            "sub": "user-123",
            "email": "test@test.com",
            "role": "authenticated",
            "aud": "authenticated",
            "iss": "https://lhrbmfpsjahwxgdylmar.supabase.co/auth/v1",
            "iat": int((now - timedelta(hours=2)).timestamp()),
            "exp": int((now - timedelta(hours=1)).timestamp()),  # Expired
        }
        token = _sign_jwt(ec_key, claims)

        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


class TestWrongIssuer:
    """Tokens with wrong issuer must be rejected."""

    def test_wrong_issuer_rejected(self, ec_key, patched_auth, test_app, valid_claims):
        """JWT with wrong iss claim → 401."""
        valid_claims["iss"] = "https://evil-project.supabase.co/auth/v1"
        token = _sign_jwt(ec_key, valid_claims)

        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


class TestWrongAudience:
    """Tokens with wrong audience must be rejected."""

    def test_wrong_audience_rejected(self, ec_key, patched_auth, test_app, valid_claims):
        """JWT with wrong aud claim → 401."""
        valid_claims["aud"] = "anon"  # Should be "authenticated"
        token = _sign_jwt(ec_key, valid_claims)

        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


class TestWrongSignature:
    """Tokens signed with a different key must be rejected."""

    def test_wrong_key_rejected(self, patched_auth, test_app, valid_claims):
        """JWT signed with a different EC key → 401."""
        # Sign with a DIFFERENT key than the one in the mock JWKS
        different_key = _generate_ec_key_pair()
        token = _sign_jwt(different_key, valid_claims, kid="test-kid-1")

        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


class TestMissingSubClaim:
    """Tokens without a sub claim must be rejected."""

    def test_missing_sub_rejected(self, ec_key, patched_auth, test_app, valid_claims):
        """JWT without sub claim → 401."""
        del valid_claims["sub"]
        token = _sign_jwt(ec_key, valid_claims)

        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


class TestUnsupportedAlgorithm:
    """Tokens using non-ES256 algorithms must be rejected."""

    def test_hs256_token_rejected(self, patched_auth, test_app, valid_claims):
        """HS256-signed JWT → 401 (we only accept ES256)."""
        # Sign with HS256 (shared secret) — must be rejected
        token = jose_jwt.encode(
            valid_claims,
            "some-shared-secret",
            algorithm="HS256",
            headers={"kid": "test-kid-1", "alg": "HS256"},
        )

        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Tests: Valid Token
# ---------------------------------------------------------------------------

class TestValidToken:
    """Valid tokens must be accepted and user info extracted."""

    def test_valid_token_extracts_user_id(
        self, ec_key, patched_auth, test_app, valid_claims
    ):
        """Properly signed JWT with valid claims → 200 with user_id."""
        token = _sign_jwt(ec_key, valid_claims)

        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "550e8400-e29b-41d4-a716-446655440000"
        assert data["email"] == "testuser@example.com"
        assert data["role"] == "authenticated"

    def test_valid_token_without_email(
        self, ec_key, patched_auth, test_app, valid_claims
    ):
        """JWT without email claim → 200, email is None."""
        del valid_claims["email"]
        token = _sign_jwt(ec_key, valid_claims)

        client = TestClient(test_app, raise_server_exceptions=False)
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "550e8400-e29b-41d4-a716-446655440000"
        assert data["email"] is None


# ---------------------------------------------------------------------------
# Tests: JWKS Cache Behavior
# ---------------------------------------------------------------------------

class TestJWKSCache:
    """JWKS cache must handle TTL expiry and kid-miss correctly."""

    def test_cache_reuses_keys_within_ttl(self, ec_key_jwk):
        """JWKS should not be re-fetched within TTL."""
        with patch("app.core.auth.requests.get") as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"keys": [ec_key_jwk]}
            mock_response.raise_for_status = MagicMock()
            mock_get.return_value = mock_response

            cache = JWKSCache(
                jwks_url="https://test.supabase.co/jwks.json",
                ttl_seconds=3600,
            )

            # First call fetches
            key1 = cache.get_key("test-kid-1")
            assert key1 is not None
            assert mock_get.call_count == 1

            # Second call uses cache
            key2 = cache.get_key("test-kid-1")
            assert key2 is not None
            assert mock_get.call_count == 1  # No additional fetch

    def test_cache_refetches_on_kid_miss(self, ec_key_jwk):
        """Unknown kid triggers a JWKS re-fetch for key rotation."""
        with patch("app.core.auth.requests.get") as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"keys": [ec_key_jwk]}
            mock_response.raise_for_status = MagicMock()
            mock_get.return_value = mock_response

            cache = JWKSCache(
                jwks_url="https://test.supabase.co/jwks.json",
                ttl_seconds=3600,
            )

            # Prime cache
            cache.get_key("test-kid-1")
            assert mock_get.call_count == 1

            # Unknown kid triggers re-fetch
            result = cache.get_key("unknown-kid")
            assert mock_get.call_count == 2  # Re-fetched
            assert result is None  # Still not found after refresh

    def test_cache_returns_none_for_missing_kid_after_refresh(self, ec_key_jwk):
        """After refresh, missing kid returns None (not an error)."""
        with patch("app.core.auth.requests.get") as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"keys": [ec_key_jwk]}
            mock_response.raise_for_status = MagicMock()
            mock_get.return_value = mock_response

            cache = JWKSCache(
                jwks_url="https://test.supabase.co/jwks.json",
                ttl_seconds=3600,
            )

            result = cache.get_key("nonexistent-kid")
            assert result is None
