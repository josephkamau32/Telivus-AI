"""
Redis Caching Service for Telivus AI

Implements comprehensive caching strategy for:
- Health assessment results
- Vector search results
- ML model predictions
- API responses
"""

from typing import Optional, Any
import json
import hashlib
from functools import wraps
import redis.asyncio as redis
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class CacheService:
    """
    Advanced caching service with Redis backend.
    
    Features:
    - Automatic cache key generation
    - TTL (Time-To-Live) management
    - Cache invalidation
    - Hit/miss metrics
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        default_ttl: int = 3600
    ):
        """
        Initialize cache service.
        
        Args:
            redis_url: Redis connection URL
            default_ttl: Default cache TTL in seconds (1 hour)
        """
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self._client: Optional[redis.Redis] = None
        self._hits = 0
        self._misses = 0
    
    async def connect(self):
        """Establish Redis connection"""
        try:
            self._client = await redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self._client.ping()
            logger.info("✅ Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Caching disabled.")
            self._client = None
    
    async def disconnect(self):
        """Close Redis connection"""
        if self._client:
            await self._client.close()
            logger.info("Redis cache disconnected")
    
    def _generate_key(self, *args, **kwargs) -> str:
        """
        Generate cache key from function arguments.
        
        Args:
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            MD5 hash of serialized arguments
        """
        # Create deterministic string from arguments
        key_data = json.dumps(
            {"args": args, "kwargs": sorted(kwargs.items())},
            sort_keys=True,
            default=str
        )
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not self._client:
            return None
        
        try:
            value = await self._client.get(key)
            if value:
                self._hits += 1
                logger.debug(f"Cache HIT: {key}")
                return json.loads(value)
            else:
                self._misses += 1
                logger.debug(f"Cache MISS: {key}")
                return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds
            
        Returns:
            True if successful, False otherwise
        """
        if not self._client:
            return False
        
        try:
            ttl = ttl or self.default_ttl
            serialized = json.dumps(value, default=str)
            await self._client.setex(
                key,
                timedelta(seconds=ttl),
                serialized
            )
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if deleted, False otherwise
        """
        if not self._client:
            return False
        
        try:
            await self._client.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """
        Clear all keys matching pattern.
        
        Args:
            pattern: Redis key pattern (e.g., "assessment:*")
            
        Returns:
            Number of keys deleted
        """
        if not self._client:
            return 0
        
        try:
            keys = await self._client.keys(pattern)
            if keys:
                deleted = await self._client.delete(*keys)
                logger.info(f"Cleared {deleted} cached keys matching {pattern}")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return 0
    
    def get_stats(self) -> dict:
        """
        Get cache performance statistics.
        
        Returns:
            Dictionary with hit/miss counts and ratios
        """
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        
        return {
            "hits": self._hits,
            "misses": self._misses,
            "total_requests": total,
            "hit_rate_percent": round(hit_rate, 2)
        }
    
    def cache_result(
        self,
        key_prefix: str = "",
        ttl: Optional[int] = None
    ):
        """
        Decorator to cache function results.
        
        Usage:
            @cache.cache_result("assessment", ttl=3600)
            async def assess_health(...):
                ...
        
        Args:
            key_prefix: Prefix for cache key
            ttl: Cache TTL in seconds
            
        Returns:
            Decorated function
        """
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                arg_key = self._generate_key(*args, **kwargs)
                cache_key = f"{key_prefix}:{arg_key}" if key_prefix else arg_key
                
                # Try to get from cache
                cached = await self.get(cache_key)
                if cached is not None:
                    return cached
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Cache result
                await self.set(cache_key, result, ttl)
                
                return result
            return wrapper
        return decorator


# Global cache instance
cache_service = CacheService()


async def initialize_cache(redis_url: Optional[str] = None):
    """Initialize global cache service"""
    if redis_url:
        cache_service.redis_url = redis_url
    await cache_service.connect()


async def shutdown_cache():
    """Shutdown cache service"""
    await cache_service.disconnect()


# Convenience function for health assessment caching
async def get_cached_assessment(
    feeling: str,
    symptoms: list,
    patient_age: int
) -> Optional[dict]:
    """
    Get cached health assessment if available.
    
    Args:
        feeling: Patient feeling
        symptoms: List of symptoms
        patient_age: Patient age
        
    Returns:
        Cached assessment or None
    """
    key = cache_service._generate_key(feeling, sorted(symptoms), patient_age)
    cache_key = f"assessment:{key}"
    return await cache_service.get(cache_key)


async def cache_assessment(
    feeling: str,
    symptoms: list,
    patient_age: int,
    assessment: dict,
    ttl: int = 3600
) -> bool:
    """
    Cache health assessment result.
    
    Args:
        feeling: Patient feeling
        symptoms: List of symptoms
        patient_age: Patient age
        assessment: Assessment result
        ttl: Cache duration (default 1 hour)
        
    Returns:
        True if cached successfully
    """
    key = cache_service._generate_key(feeling, sorted(symptoms), patient_age)
    cache_key = f"assessment:{key}"
    return await cache_service.set(cache_key, assessment, ttl)
