"""
Input Sanitization and Validation Utilities

Protects against:
- XSS (Cross-Site Scripting)
- SQL Injection
- Command Injection
- Path Traversal
- NoSQL Injection
"""

import re
import html
from typing import Any, Optional
import bleach
import logging

logger = logging.getLogger(__name__)

# Dangerous patterns to detect
SQL_INJECTION_PATTERNS = [
    r"(\bSELECT\b.*\bFROM\b)",
    r"(\bINSERT\b.*\bINTO\b)",
    r"(\bUPDATE\b.*\bSET\b)",
    r"(\bDELETE\b.*\bFROM\b)",
    r"(\bDROP\b.*\bTABLE\b)",
    r"(;|\bhaving\b|\bunion\b|\bexec\b)",
    r"(--|\#|/\*|\*/)",
]

NOSQLinjection_PATTERNS = [
    r"(\$ne|\$gt|\$lt|\$or|\$and)",
    r"(\.\.\/|\.\.\\\\)",
    r"(\{|\}|\[|\])",
]

COMMAND_INJECTION_PATTERNS = [
    r"(;|\||&|`|\$\(|\$\{)",
    r"(\n|\r|<|>)",
]


def sanitize_html(text: str, allowed_tags: Optional[list] = None) -> str:
    """
    Sanitize HTML input to prevent XSS.
    
    Args:
        text: Input text that may contain HTML
        allowed_tags: List of allowed HTML tags (default: none)
        
    Returns:
        Sanitized HTML string
    """
    if not text:
        return ""
    
    # Default: no HTML tags allowed
    if allowed_tags is None:
        allowed_tags = []
    
    # Use bleach to sanitize
    cleaned = bleach.clean(
        text,
        tags=allowed_tags,
        strip=True
    )
    
    return cleaned


def sanitize_medical_input(text: str) -> str:
    """
    Sanitize medical history and symptom input.
    
    Preserves medical terminology while removing dangerous content.
    
    Args:
        text: Medical text input
        
    Returns:
        Sanitized medical text
    """
    if not text:
        return ""
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Escape HTML entities
    text = html.escape(text)
    
    # Remove potential SQL injection attempts
    for pattern in SQL_INJECTION_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Remove potential command injection
    text = re.sub(r'[;&|`$]', '', text)
    
    # Remove excessive whitespace
    text = ' '.join(text.split())
    
    # Limit length
    max_length = 5000
    if len(text) > max_length:
        text = text[:max_length]
        logger.warning(f"Truncated medical input to {max_length} characters")
    
    return text.strip()


def sanitize_email(email: str) -> str:
    """
    Sanitize and validate email address.
    
    Args:
        email: Email address
        
    Returns:
        Sanitized email
        
    Raises:
        ValueError: If email format is invalid
    """
    if not email:
        raise ValueError("Email is required")
    
    # Remove whitespace
    email = email.strip().lower()
    
    # Basic email validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_pattern, email):
        raise ValueError("Invalid email format")
    
    # Check length
    if len(email) > 255:
        raise ValueError("Email too long")
    
    return email


def sanitize_name(name: str) -> str:
    """
    Sanitize user name input.
    
    Args:
        name: User name
        
    Returns:
        Sanitized name
        
    Raises:
        ValueError: If name is invalid
    """
    if not name:
        raise ValueError("Name is required")
    
    # Remove HTML
    name = sanitize_html(name)
    
    # Allow only letters, spaces, hyphens, apostrophes
    name = re.sub(r"[^a-zA-Z\s\-']", '', name)
    
    # Remove excessive whitespace
    name = ' '.join(name.split())
    
    # Length validation
    if len(name) < 2:
        raise ValueError("Name must be at least 2 characters")
    if len(name) > 100:
        raise ValueError("Name must be less than 100 characters")
    
    return name.strip()


def validate_and_sanitize_json(data: dict) -> dict:
    """
    Recursively sanitize all string values in JSON.
    
    Args:
        data: Dictionary to sanitize
        
    Returns:
        Sanitized dictionary
    """
    if isinstance(data, dict):
        return {
            key: validate_and_sanitize_json(value)
            for key, value in data.items()
        }
    elif isinstance(data, list):
        return [validate_and_sanitize_json(item) for item in data]
    elif isinstance(data, str):
        return sanitize_html(data)
    else:
        return data


def detect_sql_injection(text: str) -> bool:
    """
    Detect potential SQL injection attempts.
    
    Args:
        text: Input text to check
        
    Returns:
        True if suspicious patterns detected
    """
    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            logger.warning(f"Potential SQL injection detected: {pattern}")
            return True
    return False


def detect_command_injection(text: str) -> bool:
    """
    Detect potential command injection attempts.
    
    Args:
        text: Input text to check
        
    Returns:
        True if suspicious patterns detected
    """
    for pattern in COMMAND_INJECTION_PATTERNS:
        if re.search(pattern, text):
            logger.warning(f"Potential command injection detected: {pattern}")
            return True
    return False


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent path traversal.
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    if not filename:
        raise ValueError("Filename is required")
    
    # Remove path components
    filename = os.path.basename(filename)
    
    # Allow only alphanumeric, dash, underscore, dot
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Prevent directory traversal
    filename = filename.replace('..', '')
    
    # Limit length
    max_length = 255
    if len(filename) > max_length:
        name, ext = os.path.splitext(filename)
        filename = name[:max_length-len(ext)] + ext
    
    return filename


def validate_age(age: Any) -> int:
    """
    Validate and sanitize age input.
    
    Args:
        age: Age value
        
    Returns:
        Validated age as integer
        
    Raises:
        ValueError: If age is invalid
    """
    try:
        age = int(age)
    except (TypeError, ValueError):
        raise ValueError("Age must be a number")
    
    if age < 0:
        raise ValueError("Age cannot be negative")
    
    if age > 130:
        raise ValueError("Age must be less than 130")
    
    return age


def validate_symptom_severity(severity: Any) -> int:
    """
    Validate symptom severity (1-10 scale).
    
    Args:
        severity: Severity value
        
    Returns:
        Validated severity as integer
        
    Raises:
        ValueError: If severity is invalid
    """
    try:
        severity = int(severity)
    except (TypeError, ValueError):
        raise ValueError("Severity must be a number")
    
    if severity < 1 or severity > 10:
        raise ValueError("Severity must be between 1 and 10")
    
    return severity


# Import os for filename sanitization
import os
