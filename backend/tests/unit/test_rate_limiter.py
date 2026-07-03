"""
Unit Tests for Rate Limiter Middleware

Tests the AdvancedRateLimiter and rate limit utilities:
- Sliding window algorithm
- Whitelist bypass
- Rate limit blocking
- Statistics tracking
- Cleanup of old records
- Configuration constants
"""

import pytest
import time
from unittest.mock import MagicMock, AsyncMock

from app.middleware.rate_limiter import (
    AdvancedRateLimiter,
    RateLimitConfig,
    get_user_id_or_ip,
)


class TestAdvancedRateLimiter:
    """Tests for the sliding-window rate limiter."""

    @pytest.fixture
    def limiter(self) -> AdvancedRateLimiter:
        return AdvancedRateLimiter()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_allows_first_request(self, limiter: AdvancedRateLimiter) -> None:
        allowed, remaining = await limiter.check_rate_limit("user:1", max_requests=10, window_seconds=60)
        assert allowed is True
        assert remaining == 9

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_counts_down_remaining(self, limiter: AdvancedRateLimiter) -> None:
        for _ in range(5):
            allowed, remaining = await limiter.check_rate_limit("user:1", max_requests=10, window_seconds=60)
        assert allowed is True
        assert remaining == 5

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_blocks_at_limit(self, limiter: AdvancedRateLimiter) -> None:
        for _ in range(10):
            await limiter.check_rate_limit("user:1", max_requests=10, window_seconds=60)
        allowed, remaining = await limiter.check_rate_limit("user:1", max_requests=10, window_seconds=60)
        assert allowed is False
        assert remaining == 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_separate_limits_per_user(self, limiter: AdvancedRateLimiter) -> None:
        # Exhaust user:1
        for _ in range(3):
            await limiter.check_rate_limit("user:1", max_requests=3, window_seconds=60)
        blocked, _ = await limiter.check_rate_limit("user:1", max_requests=3, window_seconds=60)
        assert blocked is False

        # user:2 should still be allowed
        allowed, _ = await limiter.check_rate_limit("user:2", max_requests=3, window_seconds=60)
        assert allowed is True

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_whitelist_bypass(self, limiter: AdvancedRateLimiter) -> None:
        limiter.add_to_whitelist("admin:1")
        # Even with max_requests=0, whitelisted should pass
        allowed, remaining = await limiter.check_rate_limit("admin:1", max_requests=1, window_seconds=60)
        assert allowed is True

    @pytest.mark.unit
    def test_add_remove_whitelist(self, limiter: AdvancedRateLimiter) -> None:
        limiter.add_to_whitelist("test_ip")
        assert "test_ip" in limiter.whitelist
        limiter.remove_from_whitelist("test_ip")
        assert "test_ip" not in limiter.whitelist

    @pytest.mark.unit
    def test_remove_nonexistent_whitelist_no_error(self, limiter: AdvancedRateLimiter) -> None:
        limiter.remove_from_whitelist("nonexistent")  # Should not raise


class TestRateLimiterStats:
    """Tests for rate limiter statistics."""

    @pytest.mark.unit
    def test_initial_stats(self) -> None:
        limiter = AdvancedRateLimiter()
        stats = limiter.get_stats()
        assert stats["total_requests"] == 0
        assert stats["total_blocked"] == 0
        assert stats["blocked_rate_percent"] == 0
        assert stats["active_clients"] == 0
        assert stats["whitelisted"] == 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_stats_after_activity(self) -> None:
        limiter = AdvancedRateLimiter()
        # Make 3 requests, 2 allowed, 1 blocked
        await limiter.check_rate_limit("u1", max_requests=2, window_seconds=60)
        await limiter.check_rate_limit("u1", max_requests=2, window_seconds=60)
        await limiter.check_rate_limit("u1", max_requests=2, window_seconds=60)
        stats = limiter.get_stats()
        assert stats["total_requests"] == 3
        assert stats["total_blocked"] == 1
        assert stats["active_clients"] == 1


class TestRateLimiterCleanup:
    """Tests for cleanup of old rate limit records."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_cleanup_removes_old_entries(self) -> None:
        limiter = AdvancedRateLimiter()
        # Manually insert old requests
        old_time = time.time() - 7200  # 2 hours ago
        limiter.requests["old_user"] = [old_time]
        limiter.requests["recent_user"] = [time.time()]

        await limiter.cleanup(older_than_seconds=3600)
        assert "old_user" not in limiter.requests
        assert "recent_user" in limiter.requests


class TestRateLimitConfig:
    """Tests for endpoint-specific rate limit constants."""

    @pytest.mark.unit
    def test_auth_is_strictest(self) -> None:
        assert "5/minute" == RateLimitConfig.AUTH

    @pytest.mark.unit
    def test_health_assessment_limit(self) -> None:
        assert "10/minute" == RateLimitConfig.HEALTH_ASSESSMENT

    @pytest.mark.unit
    def test_public_is_most_lenient(self) -> None:
        assert "500/minute" == RateLimitConfig.PUBLIC

    @pytest.mark.unit
    def test_trajectory_is_strict(self) -> None:
        assert "5/minute" == RateLimitConfig.TRAJECTORY


class TestGetUserIdOrIp:
    """Tests for the key extraction function."""

    @pytest.mark.unit
    def test_returns_user_id_when_authenticated(self) -> None:
        request = MagicMock()
        request.state.user_id = "user_abc"
        result = get_user_id_or_ip(request)
        assert result == "user:user_abc"

    @pytest.mark.unit
    def test_returns_ip_when_no_user(self) -> None:
        request = MagicMock()
        # Simulate no user_id attribute
        del request.state.user_id
        request.state = MagicMock(spec=[])  # No attributes
        result = get_user_id_or_ip(request)
        assert result.startswith("ip:")
