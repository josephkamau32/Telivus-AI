"""
Unit Tests for CCEE Safety Scorer.

Tests medical guardrails and safety level determination.
"""

import pytest
from app.services.ccee.safety_scorer import SafetyScorer, SafetyLevel


class TestSafetyScorer:
    """Test suite for safety scorer."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.scorer = SafetyScorer()
    
    def test_emergency_symptoms_trigger_red(self):
        """Test that emergency symptoms trigger RED safety level."""
        result = self.scorer.calculate_safety_score(
            symptoms=["severe chest pain", "difficulty breathing"],
            assessment="Patient reports concerning symptoms",
            confidence=0.85,
            age=45,
            red_flags=None
        )
        
        assert result.safety_level == SafetyLevel.RED
        assert result.requires_immediate_care is True
        assert "EMERGENCY" in result.safety_notes
    
    def test_high_confidence_safe_symptoms_green(self):
        """Test that high confidence + safe symptoms = GREEN."""
        result = self.scorer.calculate_safety_score(
            symptoms=["headache", "mild fatigue"],
            assessment="Likely tension headache requiring rest",
            confidence=0.82,
            age=30,
            red_flags=[]
        )
        
        assert result.safety_level == SafetyLevel.GREEN
        assert result.requires_immediate_care is False
    
    def test_low_confidence_triggers_amber(self):
        """Test that low confidence triggers AMBER safety level."""
        result = self.scorer.calculate_safety_score(
            symptoms=["tired", "dizzy"],
            assessment="Non-specific symptoms, unclear etiology",
            confidence=0.45,
            age=30,
            red_flags=None
        )
        
        assert result.safety_level == SafetyLevel.AMBER
        assert result.requires_immediate_care is False
        assert "Low confidence" in result.triggered_rules or "UNCERTAIN" in result.safety_notes
    
    def test_infant_age_high_risk(self):
        """Test that infants with symptoms trigger RED."""
        result = self.scorer.calculate_safety_score(
            symptoms=["fever", "not feeding"],
            assessment="Fever in infant",
            confidence=0.75,
            age=1,  # Under 2 years
            red_flags=None
        )
        
        assert result.safety_level == SafetyLevel.RED
        assert result.requires_immediate_care is True
        assert "INFANT" in result.safety_notes or "age" in result.triggered_rules[0].lower()
    
    def test_elderly_concerning_symptoms_amber(self):
        """Test that elderly with concerning symptoms trigger AMBER."""
        result = self.scorer.calculate_safety_score(
            symptoms=["fell", "confusion"],
            assessment="Fall with confusion in elderly patient",
            confidence=0.70,
            age=80,  # Over 75
            red_flags=None
        )
        
        assert result.safety_level in [SafetyLevel.AMBER, SafetyLevel.RED]
        assert any("age" in rule.lower() or "risk" in rule.lower() for rule in result.triggered_rules)
    
    def test_safety_overrides_high_confidence(self):
        """Test that safety rules override even high confidence."""
        result = self.scorer.calculate_safety_score(
            symptoms=["chest pain"],
            assessment="Mild chest discomfort, likely muscular",
            confidence=0.90,  # High confidence
            age=50,
            red_flags=None
        )
        
        # Should still be RED due to chest pain, despite high confidence
        assert result.safety_level == SafetyLevel.RED
        assert result.requires_immediate_care is True
