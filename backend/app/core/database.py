"""
Database configuration and connection management.

Supports PostgreSQL with SQLAlchemy and async operations.
Includes comprehensive error handling and retry logic.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError, SQLAlchemyError
import logging
import asyncio
from typing import Optional

from app.core.config import settings

# SQLAlchemy base class for models
Base = declarative_base()

# Logger
logger = logging.getLogger(__name__)

# Connection configuration with timeouts
connect_args = {
    "timeout": 10,  # Connection timeout in seconds
    "command_timeout": 30,  # Command timeout in seconds
}

# Create async engine with error handling
try:
    engine = create_async_engine(
        settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_pre_ping=True,  # Test connections before using
        pool_recycle=3600,  # Recycle connections older than 1 hour
        echo=settings.DEBUG,
        connect_args=connect_args,
    )
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {e}")
    # In production, you might want to raise or handle this differently
    engine = None

# Create async session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """
    Dependency for getting database session.

    Yields:
        AsyncSession: Database session
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables(max_retries: int = 3) -> None:
    """
    Create all database tables with retry logic.

    This function should be called during application startup.
    
    Args:
        max_retries: Maximum number of retry attempts
        
    Raises:
        RuntimeError: If table creation fails after all retries
    """
    if engine is None:
        logger.error("Database engine not initialized - skipping table creation")
        return
    
    last_error = None
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                # Import all models to ensure they are registered with SQLAlchemy
                from app.models.db_models import (  # noqa: F401
                    User, HealthReport, ReportLog, ChatSession,
                    ChatMessage, ChatSubscription, ReportCache,
                    VectorDocument, APILog
                )
                # Import Digital Twin models
                from app.models.digital_twin import (  # noqa: F401
                    DigitalTwin, HealthEvent, LearnedPattern,
                    ProactiveAlert, TwinInsight, TwinLearningLog
                )

                await conn.run_sync(Base.metadata.create_all)
                logger.info("Database tables created successfully")
                return
        except OperationalError as e:
            last_error = e
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"Database connection failed (attempt {attempt + 1}/{max_retries}). Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"Failed to create database tables after {max_retries} attempts: {e}")
        except ImportError as e:
            logger.error(f"Failed to import database models: {e}")
            raise
        except Exception as e:
            last_error = e
            logger.error(f"Unexpected error creating database tables: {e}")
            break
    
    if last_error:
        raise RuntimeError(f"Failed to create database tables: {last_error}")


async def drop_tables() -> None:
    """
    Drop all database tables.

    WARNING: This will delete all data. Use with caution.
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error(f"Failed to drop database tables: {e}")
        raise


async def check_database_connection(timeout: int = 5) -> dict:
    """
    Check if database connection is working with detailed status.

    Args:
        timeout: Connection timeout in seconds
        
    Returns:
        dict: Connection status with details
    """
    if engine is None:
        return {
            "connected": False,
            "error": "Database engine not initialized",
            "details": "Check DATABASE_URL configuration"
        }
    
    try:
        # Use asyncio timeout to prevent hanging
        async with asyncio.timeout(timeout):
            async with engine.begin() as conn:
                result = await conn.execute("SELECT 1")
                await result.fetchone()
                
                return {
                    "connected": True,
                    "database_url": settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else "<unknown>",
                    "pool_size": settings.DATABASE_POOL_SIZE,
                    "message": "Connection successful"
                }
    except asyncio.TimeoutError:
        logger.error(f"Database connection check timed out after {timeout}s")
        return {
            "connected": False,
            "error": f"Connection timeout ({timeout}s)",
            "details": "Database may be unreachable or slow"
        }
    except OperationalError as e:
        logger.error(f"Database operational error: {e}")
        return {
            "connected": False,
            "error": "Operational error",
            "details": str(e)
        }
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return {
            "connected": False,
            "error": type(e).__name__,
            "details": str(e)
        }