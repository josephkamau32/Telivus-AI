"""
Database configuration and connection management.

Supports PostgreSQL with SQLAlchemy and async operations.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

from app.core.config import settings

# SQLAlchemy base class for models
Base = declarative_base()

# Logger
logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.DEBUG,
)

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


async def create_tables() -> None:
    """
    Create all database tables.

    This function should be called during application startup.
    """
    try:
        async with engine.begin() as conn:
            # Import all models to ensure they are registered with SQLAlchemy
            from app.models.db_models import (  # noqa: F401
                User, HealthReport, ReportLog, ChatSession,
                ChatMessage, ChatSubscription, ReportCache,
                VectorDocument, APILog
            )

            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


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


async def check_database_connection() -> bool:
    """
    Check if database connection is working.

    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
            return True
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False