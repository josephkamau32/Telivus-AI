"""
Supabase JWT Authentication for Telivus AI

Verifies Supabase-issued JWTs using ES256 (ECDSA P-256) public keys
fetched from the project's JWKS endpoint. No custom JWT issuance,
no password management, no mock users.

Key design decisions:
- ES256 only — no HS256 fallback (project has migrated to asymmetric signing)
- JWKS keys cached with TTL; cache refreshed on kid-miss for key rotation
- get_current_user is the sole FastAPI dependency for protected endpoints
"""

import logging
import threading
import time
from typing import Any, Dict, Optional

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from jose.utils import base64url_decode
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# HTTP Bearer token security scheme
security = HTTPBearer()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class SupabaseUser(BaseModel):
    """Authenticated user extracted from a verified Supabase JWT."""
    user_id: str   # The `sub` claim — Supabase user UUID
    email: Optional[str] = None
    role: str = "authenticated"


# ---------------------------------------------------------------------------
# JWKS Cache
# ---------------------------------------------------------------------------

class JWKSCache:
    """
    Thread-safe JWKS key cache with TTL and kid-miss refresh.

    - Fetches public keys from the Supabase JWKS endpoint
    - Caches keys for `ttl_seconds` (default: 1 hour)
    - On a kid-miss, re-fetches once to handle key rotation
    - All access is thread-safe via a lock
    """

    def __init__(self, jwks_url: str, ttl_seconds: int = 3600):
        self._jwks_url = jwks_url
        self._ttl_seconds = ttl_seconds
        self._keys: Dict[str, Dict[str, Any]] = {}
        self._last_fetch: float = 0.0
        self._lock = threading.Lock()

    def _fetch_keys(self) -> None:
        """Fetch JWKS from the endpoint and index by kid."""
        try:
            response = requests.get(self._jwks_url, timeout=10)
            response.raise_for_status()
            jwks = response.json()

            new_keys: Dict[str, Dict[str, Any]] = {}
            for key_data in jwks.get("keys", []):
                kid = key_data.get("kid")
                if kid:
                    new_keys[kid] = key_data

            if not new_keys:
                logger.error("JWKS endpoint returned no keys")
                return

            with self._lock:
                self._keys = new_keys
                self._last_fetch = time.monotonic()

            logger.info(
                "JWKS cache refreshed: %d key(s) loaded from %s",
                len(new_keys),
                self._jwks_url,
            )

        except requests.RequestException as e:
            logger.error("Failed to fetch JWKS from %s: %s", self._jwks_url, e)
            # Keep stale keys rather than going keyless
            if not self._keys:
                raise RuntimeError(
                    f"Cannot fetch JWKS and no cached keys available: {e}"
                ) from e

    def _is_stale(self) -> bool:
        """Check if cached keys are older than TTL."""
        return (time.monotonic() - self._last_fetch) > self._ttl_seconds

    def get_key(self, kid: str) -> Optional[Dict[str, Any]]:
        """
        Get a public key by kid.

        If the cache is stale or the kid is not found, re-fetches JWKS once.
        Returns None only if the kid is genuinely not present after refresh.
        """
        with self._lock:
            if not self._is_stale() and kid in self._keys:
                return self._keys[kid]

        # Cache miss or stale — re-fetch
        self._fetch_keys()

        with self._lock:
            return self._keys.get(kid)


# Module-level cache instance — initialized lazily on first use
_jwks_cache: Optional[JWKSCache] = None
_cache_init_lock = threading.Lock()


def _get_jwks_cache() -> JWKSCache:
    """Get or create the JWKS cache singleton (lazy initialization)."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    with _cache_init_lock:
        # Double-check after acquiring lock
        if _jwks_cache is not None:
            return _jwks_cache

        from app.core.config import settings

        jwks_url = settings.SUPABASE_JWKS_URL
        if not jwks_url:
            # Construct from SUPABASE_URL if JWKS_URL not explicitly set
            supabase_url = settings.SUPABASE_URL
            if not supabase_url:
                raise RuntimeError(
                    "SUPABASE_JWKS_URL or SUPABASE_URL must be set for JWT verification"
                )
            jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

        _jwks_cache = JWKSCache(jwks_url=jwks_url)
        return _jwks_cache


# ---------------------------------------------------------------------------
# JWT Verification
# ---------------------------------------------------------------------------

def verify_supabase_jwt(token: str) -> SupabaseUser:
    """
    Verify a Supabase-issued JWT using ES256 public key from JWKS.

    Validates:
    - Signature against the public key matching the token's `kid` header
    - `exp` claim (expiration)
    - `iss` claim (issuer) if configured
    - `aud` claim (audience) — must be "authenticated"

    Args:
        token: Raw JWT string (without "Bearer " prefix)

    Returns:
        SupabaseUser with user_id, email, and role extracted from claims

    Raises:
        HTTPException(401): If verification fails for any reason
    """
    from app.core.config import settings

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # --- 1. Extract kid from token header ---
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        logger.warning("JWT header decode failed")
        raise credentials_exception

    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg")

    if not kid:
        logger.warning("JWT missing kid header")
        raise credentials_exception

    if alg != "ES256":
        logger.warning("JWT uses unsupported algorithm: %s (expected ES256)", alg)
        raise credentials_exception

    # --- 2. Fetch matching public key from JWKS ---
    cache = _get_jwks_cache()
    key_data = cache.get_key(kid)

    if key_data is None:
        logger.warning("No JWKS key found for kid=%s", kid)
        raise credentials_exception

    # --- 3. Verify and decode ---
    try:
        # Build verification options
        jwt_options = {
            "verify_exp": True,
            "verify_aud": True,
            "verify_iss": bool(settings.SUPABASE_JWT_ISSUER),
        }

        payload = jwt.decode(
            token,
            key_data,
            algorithms=["ES256"],
            audience=settings.SUPABASE_JWT_AUDIENCE,
            issuer=settings.SUPABASE_JWT_ISSUER or None,
            options=jwt_options,
        )
    except JWTError as e:
        logger.warning("JWT verification failed: %s", e)
        raise credentials_exception from e

    # --- 4. Extract user info from claims ---
    user_id = payload.get("sub")
    if not user_id:
        logger.warning("JWT missing sub claim")
        raise credentials_exception

    email = payload.get("email")
    role = payload.get("role", "authenticated")

    return SupabaseUser(
        user_id=user_id,
        email=email,
        role=role,
    )


# ---------------------------------------------------------------------------
# FastAPI Dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> SupabaseUser:
    """
    FastAPI dependency: extract and verify the authenticated user from the
    Authorization header.

    Usage:
        @app.get("/protected")
        async def protected_route(user: SupabaseUser = Depends(get_current_user)):
            return {"user_id": user.user_id}

    Args:
        credentials: HTTP Bearer credentials extracted by FastAPI

    Returns:
        SupabaseUser for the authenticated caller

    Raises:
        HTTPException(401): If no token, invalid token, or verification fails
    """
    return verify_supabase_jwt(credentials.credentials)


# Alias for readability at call sites
require_authenticated = get_current_user
"""Alias for get_current_user — use at call sites where the intent is clearer."""


def _reset_jwks_cache() -> None:
    """Reset the JWKS cache singleton. For testing only."""
    global _jwks_cache
    with _cache_init_lock:
        _jwks_cache = None

