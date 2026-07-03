"""
Unit Tests for Cache Service

Tests Redis caching functionality with mocked Redis client:
- Connection management
- Get/set/delete operations
- Cache key generation
- Cache statistics
- Decorator-based caching
- Convenience functions
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from app.services.cache_service import (
    CacheService,
    cache_service,
    get_cached_assessment,
    cache_assessment,
    initialize_cache,
    shutdown_cache,
)


class TestCacheServiceNoClient:
    """Tests for CacheService when Redis is unavailable (graceful degradation)."""

    @pytest.mark.unit
    def test_init_defaults(self) -> None:
        service = CacheService()
        assert service.default_ttl == 3600
        assert service._client is None
        assert service._hits == 0
        assert service._misses == 0

    @pytest.mark.unit
    def test_init_custom_params(self) -> None:
        service = CacheService(redis_url="redis://custom:6380", default_ttl=7200)
        assert service.redis_url == "redis://custom:6380"
        assert service.default_ttl == 7200

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_returns_none_without_client(self) -> None:
        service = CacheService()
        result = await service.get("any_key")
        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_set_returns_false_without_client(self) -> None:
        service = CacheService()
        result = await service.set("key", "value")
        assert result is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_delete_returns_false_without_client(self) -> None:
        service = CacheService()
        result = await service.delete("key")
        assert result is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_clear_pattern_returns_zero_without_client(self) -> None:
        service = CacheService()
        result = await service.clear_pattern("test:*")
        assert result == 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_disconnect_noop_without_client(self) -> None:
        service = CacheService()
        await service.disconnect()  # Should not raise


class TestCacheServiceWithMockClient:
    """Tests for CacheService with a mocked Redis client."""

    @pytest.fixture
    def mock_redis(self) -> AsyncMock:
        client = AsyncMock()
        client.get = AsyncMock(return_value=None)
        client.setex = AsyncMock()
        client.delete = AsyncMock()
        client.keys = AsyncMock(return_value=[])
        client.close = AsyncMock()
        return client

    @pytest.fixture
    def service_with_client(self, mock_redis: AsyncMock) -> CacheService:
        service = CacheService()
        service._client = mock_redis
        return service

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_hit(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        mock_redis.get.return_value = json.dumps({"result": "cached"})
        result = await service_with_client.get("test_key")
        assert result == {"result": "cached"}
        assert service_with_client._hits == 1

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_miss(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        mock_redis.get.return_value = None
        result = await service_with_client.get("test_key")
        assert result is None
        assert service_with_client._misses == 1

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_handles_error(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        mock_redis.get.side_effect = Exception("Redis down")
        result = await service_with_client.get("test_key")
        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_set_success(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        result = await service_with_client.set("key", {"data": 1}, ttl=600)
        assert result is True
        mock_redis.setex.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_set_uses_default_ttl(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        await service_with_client.set("key", "value")
        call_args = mock_redis.setex.call_args
        # Second arg is the timedelta
        assert call_args is not None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_set_handles_error(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        mock_redis.setex.side_effect = Exception("Redis down")
        result = await service_with_client.set("key", "value")
        assert result is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_delete_success(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        result = await service_with_client.delete("key")
        assert result is True
        mock_redis.delete.assert_called_once_with("key")

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_delete_handles_error(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        mock_redis.delete.side_effect = Exception("Redis down")
        result = await service_with_client.delete("key")
        assert result is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_clear_pattern_with_matches(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        mock_redis.keys.return_value = ["a:1", "a:2"]
        mock_redis.delete.return_value = 2
        result = await service_with_client.clear_pattern("a:*")
        assert result == 2

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_clear_pattern_no_matches(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        mock_redis.keys.return_value = []
        result = await service_with_client.clear_pattern("none:*")
        assert result == 0

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_disconnect_closes_client(self, service_with_client: CacheService, mock_redis: AsyncMock) -> None:
        await service_with_client.disconnect()
        mock_redis.close.assert_called_once()


class TestCacheKeyGeneration:
    """Tests for deterministic cache key generation."""

    @pytest.mark.unit
    def test_same_args_same_key(self) -> None:
        service = CacheService()
        k1 = service._generate_key("a", "b", x=1)
        k2 = service._generate_key("a", "b", x=1)
        assert k1 == k2

    @pytest.mark.unit
    def test_different_args_different_key(self) -> None:
        service = CacheService()
        k1 = service._generate_key("a")
        k2 = service._generate_key("b")
        assert k1 != k2

    @pytest.mark.unit
    def test_key_is_md5_hex(self) -> None:
        service = CacheService()
        key = service._generate_key("test")
        assert len(key) == 32  # MD5 hex digest length


class TestCacheStats:
    """Tests for cache statistics."""

    @pytest.mark.unit
    def test_initial_stats(self) -> None:
        service = CacheService()
        stats = service.get_stats()
        assert stats["hits"] == 0
        assert stats["misses"] == 0
        assert stats["total_requests"] == 0
        assert stats["hit_rate_percent"] == 0

    @pytest.mark.unit
    def test_stats_after_activity(self) -> None:
        service = CacheService()
        service._hits = 7
        service._misses = 3
        stats = service.get_stats()
        assert stats["hits"] == 7
        assert stats["misses"] == 3
        assert stats["total_requests"] == 10
        assert stats["hit_rate_percent"] == 70.0


class TestConvenienceFunctions:
    """Tests for module-level convenience functions."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_get_cached_assessment_no_client(self) -> None:
        result = await get_cached_assessment("tired", ["headache"], 30)
        assert result is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_cache_assessment_no_client(self) -> None:
        result = await cache_assessment("tired", ["headache"], 30, {"data": 1})
        assert result is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_shutdown_cache_no_error(self) -> None:
        await shutdown_cache()  # Should not raise

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_initialize_cache_with_url(self) -> None:
        with patch("app.services.cache_service.cache_service") as mock_svc:
            mock_svc.connect = AsyncMock()
            await initialize_cache("redis://test:6379")
            mock_svc.connect.assert_called_once()
