"""
Unit Tests for Health Assessment Service Wrapper

Tests the HealthAssessmentService class:
- Service initialization and fallback logic
- Confidence score calculation
- Assessment metrics logging
- Symptom validation and suggestions
- Emergency assessment
- Assessment history
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.models.health import (
    HealthAssessmentRequest,
    PatientInfo,
    SymptomAssessment,
    MedicalHistory,
    Feeling,
    Gender,
)


class TestHealthAssessmentServiceInit:
    """Tests for service initialization and fallback logic."""

    @pytest.mark.unit
    def test_service_initializes(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        assert service.service is not None
        assert service.service_type in ("ai", "advanced", "simple")

    @pytest.mark.unit
    def test_service_type_is_set(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        assert isinstance(service.service_type, str)
        assert len(service.service_type) > 0


class TestConfidenceScoreCalculation:
    """Tests for the internal confidence score calculator."""

    @pytest.fixture
    def service(self):
        from app.services.health_assessment import HealthAssessmentService
        return HealthAssessmentService()

    @pytest.mark.unit
    def test_base_confidence_score(self, service) -> None:
        request = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["headache"]),
            patient_info=PatientInfo(name="Test", age=30, gender=Gender.MALE),
        )
        score = service._calculate_confidence_score(request, {})
        assert 0.0 <= score <= 1.0
        assert score >= 0.7

    @pytest.mark.unit
    def test_higher_confidence_with_medical_history(self, service) -> None:
        request_without = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["headache"]),
            patient_info=PatientInfo(name="Test", age=30),
        )
        request_with = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["headache"]),
            patient_info=PatientInfo(name="Test", age=30),
            medical_history=MedicalHistory(past_medical_conditions=["diabetes"]),
        )
        score_without = service._calculate_confidence_score(request_without, {})
        score_with = service._calculate_confidence_score(request_with, {})
        assert score_with >= score_without

    @pytest.mark.unit
    def test_higher_confidence_with_multiple_symptoms(self, service) -> None:
        request_single = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["headache"]),
            patient_info=PatientInfo(name="Test", age=30),
        )
        request_multiple = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["headache", "fever"]),
            patient_info=PatientInfo(name="Test", age=30),
        )
        score_single = service._calculate_confidence_score(request_single, {})
        score_multiple = service._calculate_confidence_score(request_multiple, {})
        assert score_multiple >= score_single

    @pytest.mark.unit
    def test_confidence_capped_at_095(self, service) -> None:
        request = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["headache", "fever", "cough"]),
            patient_info=PatientInfo(name="Test", age=30, gender=Gender.MALE),
            medical_history=MedicalHistory(
                past_medical_conditions=["diabetes"],
                current_medications=["metformin"],
            ),
        )
        score = service._calculate_confidence_score(request, {})
        assert score <= 0.95


class TestAssessmentMetrics:
    """Tests for assessment metrics logging."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_log_metrics_does_not_raise(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        request = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["headache"]),
            patient_info=PatientInfo(name="Test", age=30),
        )
        await service.log_assessment_metrics("report-123", request)


class TestSymptomValidation:
    """Tests for symptom validation."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_validate_empty_symptoms(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        symptom_data = SymptomAssessment(symptoms=["placeholder"])
        # Override to empty after construction for testing internal validation
        symptom_data.symptoms = []
        result = await service.validate_symptoms(symptom_data)
        assert result["is_valid"] is False

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_validate_normal_symptoms(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        symptom_data = SymptomAssessment(symptoms=["headache", "fever"])
        result = await service.validate_symptoms(symptom_data)
        assert result["is_valid"] is True
        assert len(result["normalized_symptoms"]) == 2

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_validate_many_symptoms_warns(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        symptoms = [f"symptom_{i}" for i in range(12)]
        symptom_data = SymptomAssessment(symptoms=symptoms)
        result = await service.validate_symptoms(symptom_data)
        assert any("Large number" in w for w in result["warnings"])


class TestEmergencyAssessment:
    """Tests for emergency assessment."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_emergency_returns_dict(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        result = await service.assess_emergency("chest pain", 50, "sudden onset")
        assert isinstance(result, dict)


class TestAssessmentHistory:
    """Tests for assessment history."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_history_returns_list(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        result = await service.get_assessment_history("user-123")
        assert isinstance(result, list)


class TestSymptomSuggestions:
    """Tests for symptom suggestions."""

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_suggestions_return_list(self) -> None:
        from app.services.health_assessment import HealthAssessmentService
        service = HealthAssessmentService()
        result = await service.get_symptom_suggestions("headache", 30)
        assert isinstance(result, list)
