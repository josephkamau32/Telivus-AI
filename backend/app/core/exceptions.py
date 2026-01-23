"""
Custom exceptions for Telivus AI Backend.

Provides a clear exception hierarchy for better error handling and debugging.
Each exception type represents a specific failure mode that can be handled appropriately.
"""


class TelivusBaseException(Exception):
    """Base exception for all Telivus AI errors."""
    pass


# AI Service Exceptions

class AIServiceError(TelivusBaseException):
    """Base class for AI service errors."""
    pass


class AIServiceUnavailableError(AIServiceError):
    """Raised when AI service is unavailable after retries.
    
    This indicates OpenAI API or other AI services are down.
    Application should use fallback assessment logic.
    """
    pass


class AIServiceTimeoutError(AIServiceError):
    """Raised when AI service times out.
    
    This indicates the AI service took too long to respond.
    Application should retry or use fallback logic.
    """
    pass


class UnexpectedAIError(AIServiceError):
    """Raised for unexpected AI errors.
    
    This is a catch-all for AI errors that don't fit other categories.
    Should be investigated as they may indicate bugs.
    """
    pass


# Data Validation Exceptions

class DataValidationError(TelivusBaseException):
    """Raised for invalid input data.
    
    This indicates user-provided data failed validation.
    Should return 400 Bad Request to client.
    """
    pass


# RAG/Vector Store Exceptions

class RAGRetrievalError(TelivusBaseException):
    """Raised when RAG retrieval fails.
    
    This indicates vector store or embedding service issues.
    Application can continue without RAG context.
    """
    pass


# CCEE Exceptions

class CCEEError(TelivusBaseException):
    """Base class for CCEE (Confidence & Explainability Engine) errors."""
    pass


class ConfidenceCalculationError(CCEEError):
    """Raised when confidence score calculation fails.
    
    This indicates an issue in the confidence scoring logic.
    """
    pass


class SafetyScoringError(CCEEError):
    """Raised when safety scoring fails.
    
    This is critical - if safety scoring fails, assessment should be marked as AMBER.
    """
    pass
