"""
Unit Tests for Exception Hierarchy

Tests the custom exception classes:
- Inheritance hierarchy
- Exception types for different failure modes
- String representations
"""

import pytest
from app.core.exceptions import (
    TelivusBaseException,
    AIServiceError,
    AIServiceUnavailableError,
    AIServiceTimeoutError,
    UnexpectedAIError,
    DataValidationError,
    RAGRetrievalError,
    CCEEError,
    ConfidenceCalculationError,
    SafetyScoringError,
)


class TestExceptionHierarchy:
    """Tests for the exception class hierarchy."""

    @pytest.mark.unit
    def test_base_exception_is_exception(self) -> None:
        assert issubclass(TelivusBaseException, Exception)

    @pytest.mark.unit
    def test_ai_service_error_inherits_base(self) -> None:
        assert issubclass(AIServiceError, TelivusBaseException)

    @pytest.mark.unit
    def test_ai_unavailable_inherits_ai_error(self) -> None:
        assert issubclass(AIServiceUnavailableError, AIServiceError)

    @pytest.mark.unit
    def test_ai_timeout_inherits_ai_error(self) -> None:
        assert issubclass(AIServiceTimeoutError, AIServiceError)

    @pytest.mark.unit
    def test_unexpected_ai_inherits_ai_error(self) -> None:
        assert issubclass(UnexpectedAIError, AIServiceError)

    @pytest.mark.unit
    def test_data_validation_inherits_base(self) -> None:
        assert issubclass(DataValidationError, TelivusBaseException)

    @pytest.mark.unit
    def test_rag_retrieval_inherits_base(self) -> None:
        assert issubclass(RAGRetrievalError, TelivusBaseException)

    @pytest.mark.unit
    def test_ccee_error_inherits_base(self) -> None:
        assert issubclass(CCEEError, TelivusBaseException)

    @pytest.mark.unit
    def test_confidence_error_inherits_ccee(self) -> None:
        assert issubclass(ConfidenceCalculationError, CCEEError)

    @pytest.mark.unit
    def test_safety_error_inherits_ccee(self) -> None:
        assert issubclass(SafetyScoringError, CCEEError)


class TestExceptionInstantiation:
    """Tests that exceptions carry messages properly."""

    @pytest.mark.unit
    def test_base_exception_message(self) -> None:
        exc = TelivusBaseException("test error")
        assert str(exc) == "test error"

    @pytest.mark.unit
    def test_ai_service_unavailable_message(self) -> None:
        exc = AIServiceUnavailableError("OpenAI API down")
        assert "OpenAI" in str(exc)

    @pytest.mark.unit
    def test_data_validation_message(self) -> None:
        exc = DataValidationError("Invalid age: -5")
        assert "Invalid age" in str(exc)

    @pytest.mark.unit
    def test_rag_retrieval_message(self) -> None:
        exc = RAGRetrievalError("Vector store offline")
        assert "Vector store" in str(exc)

    @pytest.mark.unit
    def test_exceptions_are_catchable(self) -> None:
        """All custom exceptions should be catchable via the base class."""
        exceptions = [
            AIServiceUnavailableError("test"),
            AIServiceTimeoutError("test"),
            UnexpectedAIError("test"),
            DataValidationError("test"),
            RAGRetrievalError("test"),
            ConfidenceCalculationError("test"),
            SafetyScoringError("test"),
        ]
        for exc in exceptions:
            with pytest.raises(TelivusBaseException):
                raise exc
