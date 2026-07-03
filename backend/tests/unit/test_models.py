"""
Unit Tests for Pydantic Health Models

Tests model validation, serialization, and edge cases:
- HealthAssessmentRequest validation
- PatientInfo constraints
- SymptomAssessment rules
- Enum values
- CCEE models
"""

import pytest
from app.models.health import (
    Feeling,
    Gender,
    PatientInfo,
    SymptomAssessment,
    MedicalHistory,
    HealthAssessmentRequest,
    AlertSeverity,
    AlertStatus,
    AlertType,
    SafetyLevel,
    ConfidenceBreakdown,
    EvidenceItem,
    UncertaintyFactor,
)


class TestPatientInfoModel:
    """Tests for PatientInfo Pydantic model."""

    @pytest.mark.unit
    def test_valid_patient_info(self) -> None:
        patient = PatientInfo(name="John Doe", age=30, gender=Gender.MALE)
        assert patient.name == "John Doe"
        assert patient.age == 30
        assert patient.gender == Gender.MALE

    @pytest.mark.unit
    def test_patient_info_with_contact(self) -> None:
        patient = PatientInfo(
            name="Jane", age=25, gender=Gender.FEMALE, contact_info="jane@example.com"
        )
        assert patient.contact_info == "jane@example.com"

    @pytest.mark.unit
    def test_patient_info_minimal(self) -> None:
        patient = PatientInfo(age=20)
        assert patient.age == 20
        assert patient.name is None

    @pytest.mark.unit
    def test_patient_info_age_zero(self) -> None:
        patient = PatientInfo(age=0)
        assert patient.age == 0

    @pytest.mark.unit
    def test_patient_info_age_130(self) -> None:
        patient = PatientInfo(age=130)
        assert patient.age == 130


class TestSymptomAssessmentModel:
    """Tests for SymptomAssessment model."""

    @pytest.mark.unit
    def test_valid_symptoms(self) -> None:
        sa = SymptomAssessment(symptoms=["headache", "fever"])
        assert len(sa.symptoms) == 2
        assert "headache" in sa.symptoms

    @pytest.mark.unit
    def test_symptoms_with_severity(self) -> None:
        sa = SymptomAssessment(
            symptoms=["headache"],
            severity={"headache": 7},
        )
        assert sa.severity["headache"] == 7

    @pytest.mark.unit
    def test_symptoms_with_duration(self) -> None:
        sa = SymptomAssessment(
            symptoms=["headache"],
            duration={"headache": "3 days"},
        )
        assert sa.duration["headache"] == "3 days"

    @pytest.mark.unit
    def test_symptoms_strips_whitespace(self) -> None:
        sa = SymptomAssessment(symptoms=["  headache  "])
        assert sa.symptoms[0] == "headache"


class TestFeelingEnum:
    """Tests for Feeling enum."""

    @pytest.mark.unit
    def test_all_feelings_exist(self) -> None:
        assert Feeling.GOOD == "good"
        assert Feeling.UNWELL == "unwell"
        assert Feeling.TIRED == "tired"
        assert Feeling.ANXIOUS == "anxious"
        assert Feeling.STRESSED == "stressed"


class TestGenderEnum:
    """Tests for Gender enum."""

    @pytest.mark.unit
    def test_all_genders_exist(self) -> None:
        assert Gender.MALE == "male"
        assert Gender.FEMALE == "female"
        assert Gender.OTHER == "other"
        assert Gender.PREFER_NOT_TO_SAY == "prefer-not-to-say"


class TestMedicalHistoryModel:
    """Tests for MedicalHistory model."""

    @pytest.mark.unit
    def test_full_medical_history(self) -> None:
        mh = MedicalHistory(
            past_medical_conditions=["hypertension"],
            current_medications=["lisinopril"],
            allergies=["penicillin"],
        )
        assert "hypertension" in mh.past_medical_conditions
        assert "lisinopril" in mh.current_medications
        assert "penicillin" in mh.allergies

    @pytest.mark.unit
    def test_empty_medical_history(self) -> None:
        mh = MedicalHistory()
        assert mh.past_medical_conditions is None
        assert mh.current_medications is None


class TestHealthAssessmentRequestModel:
    """Tests for HealthAssessmentRequest model."""

    @pytest.mark.unit
    def test_valid_request(self) -> None:
        request = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(symptoms=["headache"]),
            patient_info=PatientInfo(name="Test", age=30, gender=Gender.MALE),
        )
        assert request.feeling == Feeling.UNWELL
        assert len(request.symptom_assessment.symptoms) == 1

    @pytest.mark.unit
    def test_request_with_medical_history(self) -> None:
        request = HealthAssessmentRequest(
            feeling=Feeling.TIRED,
            symptom_assessment=SymptomAssessment(symptoms=["fatigue"]),
            patient_info=PatientInfo(age=45),
            medical_history=MedicalHistory(past_medical_conditions=["diabetes"]),
        )
        assert request.medical_history is not None


class TestAlertEnums:
    """Tests for alert-related enums."""

    @pytest.mark.unit
    def test_alert_severity_values(self) -> None:
        assert AlertSeverity.LOW is not None
        assert AlertSeverity.MEDIUM is not None
        assert AlertSeverity.HIGH is not None
        assert AlertSeverity.CRITICAL is not None

    @pytest.mark.unit
    def test_alert_status_values(self) -> None:
        assert AlertStatus.ACTIVE is not None
        assert AlertStatus.ACKNOWLEDGED is not None

    @pytest.mark.unit
    def test_alert_type_values(self) -> None:
        assert len(AlertType) > 0


class TestSafetyLevel:
    """Tests for SafetyLevel enum."""

    @pytest.mark.unit
    def test_safety_levels(self) -> None:
        assert SafetyLevel.GREEN == "green"
        assert SafetyLevel.AMBER == "amber"
        assert SafetyLevel.RED == "red"


class TestConfidenceBreakdownModel:
    """Tests for ConfidenceBreakdown Pydantic model."""

    @pytest.mark.unit
    def test_valid_breakdown(self) -> None:
        cb = ConfidenceBreakdown(
            data_completeness=0.9,
            symptom_signal_strength=0.8,
            rag_relevance=0.7,
            agent_agreement=0.85,
            model_consistency=0.9,
        )
        assert cb.data_completeness == 0.9
        assert cb.symptom_signal_strength == 0.8
        assert cb.rag_relevance == 0.7

    @pytest.mark.unit
    def test_boundary_values(self) -> None:
        cb = ConfidenceBreakdown(
            data_completeness=0.0,
            symptom_signal_strength=0.0,
            rag_relevance=0.0,
            agent_agreement=0.0,
            model_consistency=0.0,
        )
        assert cb.data_completeness == 0.0


class TestEvidenceItemModel:
    """Tests for EvidenceItem Pydantic model."""

    @pytest.mark.unit
    def test_valid_evidence(self) -> None:
        item = EvidenceItem(
            symptom="headache",
            supporting_sources=["Medical Knowledge Base", "WHO Guidelines"],
            confidence_contribution=0.35,
        )
        assert item.symptom == "headache"
        assert len(item.supporting_sources) == 2
        assert item.confidence_contribution == 0.35


class TestUncertaintyFactorModel:
    """Tests for UncertaintyFactor Pydantic model."""

    @pytest.mark.unit
    def test_valid_uncertainty_factor(self) -> None:
        factor = UncertaintyFactor(
            category="missing_data",
            description="No medical history provided",
            impact="Reduces confidence by 15%",
            suggestion="Provide past medical conditions",
        )
        assert factor.category == "missing_data"
        assert "medical history" in factor.description
