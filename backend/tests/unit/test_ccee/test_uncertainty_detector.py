"""
Unit Tests for CCEE Uncertainty Detector

Tests detection of missing data, vague symptoms, and confidence-reducing factors.
"""

import pytest
from app.models.health import (
    HealthAssessmentRequest,
    PatientInfo,
    SymptomAssessment,
    MedicalHistory,
    Feeling,
    Gender,
)
from app.services.ccee.uncertainty_detector import UncertaintyDetector, UncertaintyFactor


class TestUncertaintyDetection:
    """Tests for the UncertaintyDetector."""

    @pytest.fixture
    def detector(self) -> UncertaintyDetector:
        return UncertaintyDetector()

    @pytest.fixture
    def full_request(self) -> HealthAssessmentRequest:
        """A comprehensive request with all data filled in."""
        return HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(
                symptoms=["severe headache", "nausea", "dizziness"],
                severity={"severe headache": 8, "nausea": 5, "dizziness": 6},
                duration={"severe headache": "3 days", "nausea": "1 day"},
            ),
            patient_info=PatientInfo(name="Test", age=35, gender=Gender.MALE),
            medical_history=MedicalHistory(
                past_medical_conditions=["hypertension"],
                current_medications=["lisinopril"],
                allergies=["penicillin"],
            ),
        )

    @pytest.fixture
    def minimal_request(self) -> HealthAssessmentRequest:
        """A minimal request with limited data."""
        return HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["pain"]),
            patient_info=PatientInfo(age=30),
        )

    @pytest.mark.unit
    def test_full_request_has_fewer_factors(
        self, detector: UncertaintyDetector, full_request: HealthAssessmentRequest
    ) -> None:
        factors = detector.detect_uncertainty_factors(full_request, None)
        assert isinstance(factors, list)
        assert len(factors) < 5

    @pytest.mark.unit
    def test_minimal_request_has_more_factors(
        self, detector: UncertaintyDetector, minimal_request: HealthAssessmentRequest
    ) -> None:
        factors = detector.detect_uncertainty_factors(minimal_request, None)
        assert isinstance(factors, list)
        assert len(factors) > 0

    @pytest.mark.unit
    def test_factors_are_uncertainty_factor_type(
        self, detector: UncertaintyDetector, minimal_request: HealthAssessmentRequest
    ) -> None:
        factors = detector.detect_uncertainty_factors(minimal_request, None)
        for factor in factors:
            assert isinstance(factor, UncertaintyFactor)
            assert factor.category in ("missing_data", "vague_symptoms", "conflicting_info", "insufficient_detail")
            assert len(factor.description) > 0
            assert len(factor.suggestion) > 0

    @pytest.mark.unit
    def test_suggest_additional_data(
        self, detector: UncertaintyDetector, minimal_request: HealthAssessmentRequest
    ) -> None:
        suggestions = detector.suggest_additional_data(minimal_request, None)
        assert isinstance(suggestions, list)
        assert len(suggestions) > 0
        for s in suggestions:
            assert isinstance(s, str)
