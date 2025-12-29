"""
Unit Tests for Health Assessment Service

Tests the core health assessment functionality including:
- Symptom analysis
- AI-powered assessment generation
- Response validation
- Error handling
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import json
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from test_helpers import (
    validate_symptom_severity,
    categorize_symptoms,
    validate_assessment_structure,
    calculate_confidence_score
)


class TestHealthAssessmentService:
    """Test suite for health assessment service"""
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_assess_symptoms_valid_input(
        self, 
        sample_health_assessment_request,
        mock_ai_assessment
    ):
        """Test health assessment with valid input"""
        from app.services.health_assessment_ai import assess_health
        
        with patch('app.services.health_assessment_ai.get_openai_response') as mock_openai:
            mock_openai.return_value = json.dumps(mock_ai_assessment)
            
            result = await assess_health(
                feeling=sample_health_assessment_request["feeling"],
                symptom_assessment=sample_health_assessment_request["symptom_assessment"],
                patient_info=sample_health_assessment_request["patient_info"],
                medical_history=sample_health_assessment_request["medical_history"]
            )
            
            assert result is not None
            assert "medical_assessment" in result
            assert result["confidence_score"] >= 0.7
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_assess_symptoms_emergency_detection(self):
        """Test emergency symptom detection"""
        from app.services.health_assessment_ai import assess_health
        
        # Emergency symptoms
        emergency_request = {
            "feeling": "unwell",
            "symptom_assessment": {
                "symptoms": ["severe chest pain", "difficulty breathing", "confusion"],
                "severity": {"severe chest pain": 10, "difficulty breathing": 9}
            },
            "patient_info": {"name": "Test", "age": 45, "gender": "male"}
        }
        
        with patch('app.services.health_assessment_ai.get_openai_response') as mock_openai:
            mock_response = {
                "medical_assessment": {
                    "diagnostic_plan": {
                        "red_flags": ["Severe chest pain - possible cardiac emergency"],
                        "emergency_care_needed": True
                    }
                }
            }
            mock_openai.return_value = json.dumps(mock_response)
            
            result = await assess_health(**emergency_request)
            
            # Should detect emergency
            assert "red_flags" in result["medical_assessment"]["diagnostic_plan"]
            assert len(result["medical_assessment"]["diagnostic_plan"]["red_flags"]) > 0
    
    @pytest.mark.unit
    def test_symptom_severity_validation(self):
        """Test symptom severity is within valid range (1-10)"""
        from app.api.v1.endpoints.health import validate_symptom_severity
        
        # Valid severity
        assert validate_symptom_severity({"headache": 7}) == True
        
        # Invalid severity (too high)
        assert validate_symptom_severity({"headache": 15}) == False
        
        # Invalid severity (too low)
        assert validate_symptom_severity({"headache": 0}) == False
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_assess_symptoms_missing_required_fields(self):
        """Test that missing required fields raise validation error"""
        from app.services.health_assessment_ai import assess_health
        
        with pytest.raises(ValueError):
            await assess_health(
                feeling=None,  # Missing required field
                symptom_assessment={"symptoms": []},
                patient_info={"name": "Test", "age": 30}
            )
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_assess_symptoms_age_validation(self):
        """Test age validation (0-130)"""
        from app.services.health_assessment_ai import assess_health
        
        # Valid ages
        for age in [0, 1, 30, 130]:
            request = {
                "feeling": "good",
                "symptom_assessment": {"symptoms": ["headache"]},
                "patient_info": {"name": "Test", "age": age, "gender": "male"}
            }
            # Should not raise error
            with patch('app.services.health_assessment_ai.get_openai_response'):
                try:
                    await assess_health(**request)
                except ValueError:
                    pytest.fail(f"Age {age} should be valid")
        
        # Invalid ages
        for age in [-1, 150, 200]:
            request = {
                "feeling": "good",
                "symptom_assessment": {"symptoms": ["headache"]},
                "patient_info": {"name": "Test", "age": age, "gender": "male"}
            }
            with pytest.raises(ValueError):
                await assess_health(**request)
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_ai_fallback_on_api_error(self):
        """Test fallback mechanism when AI API fails"""
        from app.services.health_assessment_ai import assess_health
        
        with patch('app.services.health_assessment_ai.get_openai_response') as mock_openai:
            mock_openai.side_effect = Exception("API Error")
            
            request = {
                "feeling": "unwell",
                "symptom_assessment": {"symptoms": ["headache"]},
                "patient_info": {"name": "Test", "age": 30, "gender": "male"}
            }
            
            # Should use fallback
            result = await assess_health(**request)
            
            # Should still return a valid response
            assert result is not None
            assert "medical_assessment" in result
    
    @pytest.mark.unit
    def test_symptom_categorization(self):
        """Test symptom categorization (common, serious, emergency)"""
        from app.services.health_assessment_ai import categorize_symptoms
        
        common = categorize_symptoms(["headache", "fatigue", "mild cough"])
        assert common["category"] == "common"
        
        serious = categorize_symptoms(["high fever", "severe pain", "persistent vomiting"])
        assert serious["category"] in ["serious", "emergency"]
        
        emergency = categorize_symptoms(["chest pain", "difficulty breathing", "severe bleeding"])
        assert emergency["category"] == "emergency"
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_assessment_response_structure(self, mock_ai_assessment):
        """Test that assessment response has correct structure"""
        from app.services.health_assessment_ai import validate_assessment_structure
        
        # Should have all required fields
        required_fields = [
            "patient_info",
            "medical_assessment",
            "confidence_score",
            "generated_at"
        ]
        
        for field in required_fields:
            assert field in mock_ai_assessment, f"Missing required field: {field}"
        
        # Medical assessment should have subfields
        medical_required = [
            "chief_complaint",
            "assessment",
            "diagnostic_plan",
            "otc_recommendations",
            "lifestyle_recommendations"
        ]
        
        for field in medical_required:
            assert field in mock_ai_assessment["medical_assessment"], \
                f"Missing medical assessment field: {field}"
    
    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_confidence_score_calculation(self):
        """Test AI confidence score is properly calculated"""
        from app.services.health_assessment_ai import calculate_confidence_score
        
        # High confidence (clear symptoms)
        high_conf = calculate_confidence_score(
            symptoms=["fever", "cough", "sore throat"],
            symptom_count=3,
            medical_history_provided=True
        )
        assert high_conf >= 0.7
        
        # Low confidence (vague symptoms, no history)
        low_conf = calculate_confidence_score(
            symptoms=["tired"],
            symptom_count=1,
            medical_history_provided=False
        )
        assert low_conf < 0.7
