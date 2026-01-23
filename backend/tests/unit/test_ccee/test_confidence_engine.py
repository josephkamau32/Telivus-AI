"""
Unit Tests for CCEE Confidence Engine.

Tests confidence scoring with weighted formula.
"""

import pytest
from app.services.ccee.confidence_engine import ConfidenceEngine
from app.models.health import (
    HealthAssessmentRequest,
    SymptomAssessment,
    PatientInfo,
    MedicalHistory,
    Feeling
)


class TestConfidenceEngine:
    """Test suite for confidence engine."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.engine = ConfidenceEngine()
    
    def test_confidence_score_complete_data(self):
        """Test confidence score with complete, high-quality data."""
        request = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(
                symptoms=["headache", "fever", "fatigue"],
                severity={"headache": 7, "fever": 8, "fatigue": 6},
                duration={"headache": "2 days", "fever": "2 days", "fatigue": "3 days"}
            ),
            patient_info=PatientInfo(
                name="Test Patient",
                age=30,
                gender="male"
            ),
            medical_history=MedicalHistory(
                past_medical_conditions=["Hypertension"],
                current_medications=["Lisinopril"],
                allergies=["Penicillin"]
            )
        )
        
        assessment_data = {
            "chief_complaint": "Headache and fever",
            "history_present_illness": "Symptoms started 2 days ago",
            "assessment": "Likely viral infection",
            "diagnostic_plan": {"tests": [], "red_flags": []},
            "otc_recommendations": []
        }
        
        result = self.engine.calculate_confidence_score(
            request=request,
            assessment_data=assessment_data,
            rag_results=None,
            emergency_check=None
        )
        
        assert result.overall_score >= 0.75  # Should be high confidence
        assert result.level == "high"
        assert result.data_completeness >= 0.9  # All data provided
    
    def test_confidence_score_missing_history(self):
        """Test confidence score with missing medical history."""
        request = HealthAssessmentRequest(
            feeling=Feeling.TIRED,
            symptom_assessment=SymptomAssessment(
                symptoms=["tired"]
            ),
            patient_info=PatientInfo(
                age=30
            ),
            medical_history=None  # Missing
        )
        
        assessment_data = {
            "chief_complaint": "Fatigue",
            "assessment": "Non-specific symptoms",
            "diagnostic_plan": {},
            "otc_recommendations": []
        }
        
        result = self.engine.calculate_confidence_score(
            request=request,
            assessment_data=assessment_data,
            rag_results=None,
            emergency_check=None
        )
        
        assert result.overall_score < 0.70  # Should be lower confidence
        assert result.level in ["low", "medium"]
        assert result.data_completeness < 0.5  # Limited data
    
    def test_confidence_breakdown_weights(self):
        """Test that confidence breakdown weights sum correctly."""
        assert abs(
            ConfidenceEngine.WEIGHT_DATA_COMPLETENESS +
            ConfidenceEngine.WEIGHT_SYMPTOM_SIGNAL +
            ConfidenceEngine.WEIGHT_RAG_RELEVANCE +
            ConfidenceEngine.WEIGHT_AGENT_AGREEMENT +
            ConfidenceEngine.WEIGHT_MODEL_CONSISTENCY - 1.0
        ) < 0.001  # Should sum to 1.0
    
    def test_data_completeness_calculation(self):
        """Test data completeness scoring."""
        # Complete data
        request = HealthAssessmentRequest(
            feeling=Feeling.UNWELL,
            symptom_assessment=SymptomAssessment(
                symptoms=["headache"],
                severity={"headache": 7},
                duration={"headache": "2 days"}
            ),
            patient_info=PatientInfo(age=30, gender="male"),
            medical_history=MedicalHistory(past_medical_conditions=["None"])
        )
        
        score = self.engine._calculate_data_completeness(request)
        assert score >= 0.8  # Most fields provided
        
        # Minimal data
        minimal_request = HealthAssessmentRequest(
            feeling=Feeling.GOOD,
            symptom_assessment=SymptomAssessment(symptoms=["tired"]),
            patient_info=PatientInfo(age=30)
        )
        
        minimal_score = self.engine._calculate_data_completeness(minimal_request)
        assert minimal_score < score  # Should be lower
