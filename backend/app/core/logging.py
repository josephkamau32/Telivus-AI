"""
Logging configuration for Telivus AI Backend.

Provides structured logging with different levels and formats for development and production.
"""

import logging
import sys
from typing import Dict, Any

from app.core.config import settings


class SimpleFormatter(logging.Formatter):
    """
    Simple formatter for development and basic logging.
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with basic information."""
        # Add service information
        record.service = "telivus-ai-backend"
        record.version = "1.0.0"

        # Use standard format
        return super().format(record)


def setup_logging() -> None:
    """
    Configure logging for the application.

    In development: Uses colored console output
    In production: Uses JSON structured logging
    """
    # Clear existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    # Set log level
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    root_logger.setLevel(log_level)

    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)

    if settings.DEBUG:
        # Development: Colored console output
        try:
            from colorlog import ColoredFormatter
            color_formatter = ColoredFormatter(
                "%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
                log_colors={
                    "DEBUG": "cyan",
                    "INFO": "green",
                    "WARNING": "yellow",
                    "ERROR": "red",
                    "CRITICAL": "red,bg_white",
                },
            )
            console_handler.setFormatter(color_formatter)
        except ImportError:
            # Fallback to simple formatter if colorlog not available
            simple_formatter = SimpleFormatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S"
            )
            console_handler.setFormatter(simple_formatter)
    else:
        # Production: Simple structured logging
        simple_formatter = SimpleFormatter(
            "%(asctime)s %(name)s %(levelname)s %(message)s"
        )
        console_handler.setFormatter(simple_formatter)

    # Add handler to root logger
    root_logger.addHandler(console_handler)

    # Configure specific loggers
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)

    # Configure AI-related loggers
    logging.getLogger("langchain").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)

    # Create logger for this module
    logger = logging.getLogger(__name__)
    logger.info("Logging configured successfully")


def get_logger(name: str) -> logging.Logger:
    """
    Get a configured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)