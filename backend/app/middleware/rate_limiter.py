"""
Rate Limiting Middleware for Telivus AI

Implements multi-tier rate limiting:
- Per-IP rate limiting
- Per-user rate limiting (after auth)
- Per-endpoint custom limits
- Sliding window algorithm
"""

from typing import Optional, Callable
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import time
from collections import defaultdict
import asyncio
import logging

logger = logging.getLogger(__name__)


# Custom key function for authenticated users
def get_user_id_or_ip(request: Request) -> str:
    """
    Get user ID if authenticated, otherwise IP address.
    
    This allows stricter limits for unauthenticated users
    and per-user limits for authenticated users.
    """
    # Try to get user from JWT token or session
    user_id = getattr(request.state, "user_id", None)
    
    if user_id:
        return f"user:{user_id}"
    
    # Fallback to IP address
    return f"ip:{get_remote_address(request)}"


# Create limiter instance
limiter = Limiter(
    key_func=get_user_id_or_ip,
    default_limits=["100/minute"],  # Global default
    storage_uri="memory://",  # Use Redis in production
    strategy="moving-window"  # More accurate than fixed-window
)


# Custom rate limit exceeded handler
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors.
    
    Returns detailed error message with retry-after header.
    """
    response = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down and try again later.",
            "detail": str(exc.detail),
            "retry_after_seconds": exc.detail.split()[-2] if hasattr(exc, 'detail') else 60
        }
    )
    
    # Add Retry-After header
    response.headers["Retry-After"] = "60"
    response.headers["X-RateLimit-Limit"] = str(exc.detail).split("/")[0] if hasattr(exc, 'detail') else "100"
    response.headers["X-RateLimit-Remaining"] = "0"
    response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)
    
    logger.warning(
        f"Rate limit exceeded: {get_user_id_or_ip(request)} "
        f"on {request.url.path}"
    )
    
    return response


class AdvancedRateLimiter:
    """
    Advanced rate limiting with sliding window and multiple tiers.
    
    Features:
    - Sliding window algorithm
    - Per-endpoint limits
    - Burst protection
    - Whitelist support
    - Analytics
    """
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.whitelist = set()
        self._lock = asyncio.Lock()
        self._total_requests = 0
        self._total_blocked = 0
    
    def add_to_whitelist(self, identifier: str):
        """Add IP or user ID to whitelist (no rate limiting)"""
        self.whitelist.add(identifier)
        logger.info(f"Added {identifier} to rate limit whitelist")
    
    def remove_from_whitelist(self, identifier: str):
        """Remove from whitelist"""
        self.whitelist.discard(identifier)
    
    async def check_rate_limit(
        self,
        identifier: str,
        max_requests: int = 100,
        window_seconds: int = 60
    ) -> tuple[bool, int]:
        """
        Check if request is within rate limit.
        
        Args:
            identifier: User ID or IP address
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (allowed, remaining_requests)
        """
        # Whitelist bypass
        if identifier in self.whitelist:
            return True, max_requests
        
        async with self._lock:
            self._total_requests += 1
            current_time = time.time()
            cutoff_time = current_time - window_seconds
            
            # Get requests in current window
            requests = self.requests[identifier]
            
            # Remove old requests
            requests = [req_time for req_time in requests if req_time > cutoff_time]
            self.requests[identifier] = requests
            
            # Check limit
            if len(requests) >= max_requests:
                self._total_blocked += 1
                logger.warning(
                    f"Rate limit exceeded for {identifier}: "
                    f"{len(requests)}/{max_requests} in {window_seconds}s"
                )
                return False, 0
            
            # Add current request
            requests.append(current_time)
            remaining = max_requests - len(requests)
            
            return True, remaining
    
    def get_stats(self) -> dict:
        """Get rate limiting statistics"""
        blocked_rate = (
            (self._total_blocked / self._total_requests * 100)
            if self._total_requests > 0
            else 0
        )
        
        return {
            "total_requests": self._total_requests,
            "total_blocked": self._total_blocked,
            "blocked_rate_percent": round(blocked_rate, 2),
            "active_clients": len(self.requests),
            "whitelisted": len(self.whitelist)
        }
    
    async def cleanup(self, older_than_seconds: int = 3600):
        """
        Cleanup old request records.
        
        Args:
            older_than_seconds: Remove records older than this
        """
        async with self._lock:
            current_time = time.time()
            cutoff = current_time - older_than_seconds
            
            # Remove old entries
            to_remove = []
            for identifier, requests in self.requests.items():
                requests = [req_time for req_time in requests if req_time > cutoff]
                if not requests:
                    to_remove.append(identifier)
                else:
                    self.requests[identifier] = requests
            
            for identifier in to_remove:
                del self.requests[identifier]
            
            logger.info(f"Cleaned up {len(to_remove)} inactive rate limit entries")


# Global advanced rate limiter instance
advanced_limiter = AdvancedRateLimiter()


# Endpoint-specific rate limits (decorators for FastAPI)
class RateLimitConfig:
    """Rate limit configurations for different endpoints"""
    
    # Authentication endpoints (strict)
    AUTH = "5/minute"
    
    # Health assessment (moderate - AI is expensive)
    HEALTH_ASSESSMENT = "10/minute"
    
    # Chat/consultation (moderate)
    CHAT = "20/minute"
    
    # Read-only endpoints (lenient)
    READ_ONLY = "100/minute"
    
    # Public endpoints (very lenient)
    PUBLIC = "500/minute"
    
    # Trajectory prediction (strict - ML heavy)
    TRAJECTORY = "5/minute"
    
    # Alerts (moderate)
    ALERTS = "30/minute"


async def rate_limit_middleware(request: Request, call_next):
    """
    Middleware to apply rate limiting to all requests.
    
    Adds rate limit headers to all responses.
    """
    identifier = get_user_id_or_ip(request)
    
    # Check advanced rate limit
    allowed, remaining = await advanced_limiter.check_rate_limit(
        identifier,
        max_requests=100,
        window_seconds=60
    )
    
    if not allowed:
        return await custom_rate_limit_handler(
            request,
            RateLimitExceeded("Rate limit exceeded")
        )
    
    # Process request
    response = await call_next(request)
    
    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = "100"
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)
    
    return response
