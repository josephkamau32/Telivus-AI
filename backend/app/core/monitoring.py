"""
Sentry Integration for Error Tracking

Comprehensive error monitoring with:
- Automatic exception tracking
- Performance monitoring
- User context
- Custom tags and metadata
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def init_sentry(
    dsn: Optional[str] = None,
    environment: str = "production",
    traces_sample_rate: float = 0.1,
    enable_tracing: bool = True
):
    """
    Initialize Sentry SDK for error tracking and performance monitoring.
    
    Args:
        dsn: Sentry DSN (Data Source Name)
        environment: Environment name (production, staging, development)
        traces_sample_rate: Percentage of transactions to sample (0.0 to 1.0)
        enable_tracing: Whether to enable performance tracing
    """
    if not dsn:
        logger.warning("Sentry DSN not provided. Error tracking disabled.")
        return
    
    try:
        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            traces_sample_rate=traces_sample_rate if enable_tracing else 0.0,
            
            # Integrations
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                RedisIntegration(),
            ],
            
            # Error filtering
            before_send=before_send_filter,
            
            # Release tracking (use git commit hash in production)
            release="telivus-ai@1.0.0",
            
            # Additional options
            attach_stacktrace=True,
            send_default_pii=False,  # Don't send personally identifiable info
            max_breadcrumbs=50,
            debug=False,
        )
        
        logger.info(f"✅ Sentry initialized for environment: {environment}")
    
    except Exception as e:
        logger.error(f"❌ Failed to initialize Sentry: {e}")


def before_send_filter(event, hint):
    """
    Filter events before sending to Sentry.
    
    Args:
        event: Sentry event dict
        hint: Event hint with exception info
        
    Returns:
        Modified event or None to drop event
    """
    # Don't send events for known, expected exceptions
    if "exc_info" in hint:
        exc_type, exc_value, tb = hint["exc_info"]
        
        # Ignore certain HTTP exceptions
        if hasattr(exc_value, "status_code"):
            # Don't track 404s or 401s
            if exc_value.status_code in [404, 401]:
                return None
    
    # Add custom tags
    event.setdefault("tags", {})
    event["tags"]["component"] = "telivus-ai-backend"
    
    return event


def capture_exception(
    exception: Exception,
    user_id: Optional[str] = None,
    extra_context: Optional[dict] = None
):
    """
    Manually capture an exception with context.
    
    Args:
        exception: Exception to capture
        user_id: Optional user ID for context
        extra_context: Additional context data
    """
    with sentry_sdk.push_scope() as scope:
        # Add user context
        if user_id:
            scope.set_user({"id": user_id})
        
        # Add extra context
        if extra_context:
            for key, value in extra_context.items():
                scope.set_context(key, value)
        
        # Capture exception
        sentry_sdk.capture_exception(exception)


def capture_message(
    message: str,
    level: str = "info",
    extra_context: Optional[dict] = None
):
    """
    Capture a message (not an exception).
    
    Args:
        message: Message to capture
        level: Severity level (debug, info, warning, error, fatal)
        extra_context: Additional context
    """
    with sentry_sdk.push_scope() as scope:
        if extra_context:
            for key, value in extra_context.items():
                scope.set_context(key, value)
        
        sentry_sdk.capture_message(message, level=level)


def set_user_context(user_id: str, email: Optional[str] = None):
    """
    Set user context for all subsequent events.
    
    Args:
        user_id: User identifier
        email: User email
    """
    sentry_sdk.set_user({
        "id": user_id,
        "email": email
    })


def set_tag(key: str, value: str):
    """
    Set a tag for all subsequent events.
    
    Args:
        key: Tag key
        value: Tag value
    """
    sentry_sdk.set_tag(key, value)


def add_breadcrumb(
    category: str,
    message: str,
    level: str = "info",
    data: Optional[dict] = None
):
    """
    Add a breadcrumb to track user actions.
    
    Args:
        category: Breadcrumb category
        message: Breadcrumb message
        level: Severity level
        data: Additional data
    """
    sentry_sdk.add_breadcrumb(
        category=category,
        message=message,
        level=level,
        data=data or {}
    )
