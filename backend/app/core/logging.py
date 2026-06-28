"""
Logging configuration for Telivus AI Backend.

Provides structured logging with structlog for production (JSON format)
and colored console output for development.
"""

import logging
import sys
from typing import Any

import structlog

from app.core.config import settings


def setup_logging() -> None:
    """
    Configure logging for the application.

    In development: Uses colored console output via structlog's dev renderer.
    In production: Uses JSON structured logging (standard in German engineering teams).
    """
    # Set log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Configure structlog processors
    shared_processors: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if settings.DEBUG:
        # Development: colored, human-readable output
        renderer = structlog.dev.ConsoleRenderer(colors=True)
    else:
        # Production: JSON structured logging (GDPR-friendly, parseable by ELK/Grafana)
        shared_processors.append(structlog.processors.format_exc_info)
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Create formatter for stdlib logging integration
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(log_level)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Quiet noisy third-party loggers
    for logger_name in [
        "uvicorn", "uvicorn.access", "fastapi",
        "langchain", "openai", "chromadb", "httpx",
    ]:
        logging.getLogger(logger_name).setLevel(logging.WARNING)

    logger = structlog.get_logger(__name__)
    logger.info("logging_configured", mode="development" if settings.DEBUG else "production")


def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance.

    This returns a stdlib logger that is processed through structlog's formatter.
    For structured context, use structlog.get_logger() directly.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)