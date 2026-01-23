"""
Safety Scorer for Clinical Confidence & Explainability Engine (CCEE).

Applies deterministic medical guardrails to override AI confidence when necessary.
Safety levels: GREEN (safe), AMBER (caution), RED (emergency).
"""

from typing import List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass
from app.core.logging import get_logger

logger = get_logger(__name__)


class SafetyLevel(str, Enum):
    """Medical safety levels."""
    GREEN = "green"
    AMBER = "amber"
    RED = "red"


@dataclass
class SafetyResult:
    """Safety scoring result."""
    safety_level: SafetyLevel
    safety_notes: str
    triggered_rules: List[str]
    requires_immediate_care: bool


class SafetyScorer:
    """
    Applies medical safety guardrails with deterministic rules.
    
    Safety layer ALWAYS overrides AI confidence for patient safety.
    Uses clear, auditable rules that can be traced and explained.
    """
    
    # Emergency symptoms requiring immediate care
    EMERGENCY_SYMPTOMS = [
        'chest pain', 'severe chest pain', 'crushing chest pain',
        'difficulty breathing', 'shortness of breath', 'can\'t breathe', 'cannot breathe',
        'severe bleeding', 'heavy bleeding', 'bleeding won\'t stop',
        'unconscious', 'unconsciousness', 'passed out', 'fainting',
        'severe headache', 'worst headache', 'thunderclap headache',
        'confusion', 'disoriented', 'altered mental status',
        'stroke symptoms', 'face drooping', 'arm weakness', 'speech difficulty',
        'severe abdominal pain', 'severe stomach pain',
        'seizure', 'convulsion',
        'suicidal thoughts', 'wanting to harm self'
    ]
    
    # High-risk age groups
    HIGH_RISK_INFANT_AGE = 2  # Under 2 years
    HIGH_RISK_ELDERLY_AGE = 75  # Over 75 years
    
    # Confidence thresholds
    LOW_CONFIDENCE_THRESHOLD = 0.50
    MEDIUM_CONFIDENCE_THRESHOLD = 0.70
    
    def calculate_safety_score(
        self,
        symptoms: List[str],
        assessment: str,
        confidence: float,
        age: int,
        red_flags: Optional[List[str]] = None
    ) -> SafetyResult:
        """
        Calculate safety score using deterministic medical rules.
        
        Args:
            symptoms: List of reported symptoms
            assessment: AI-generated assessment text
            confidence: Calculated confidence score (0.0-1.0)
            age: Patient age
            red_flags: Red flags from diagnostic plan
            
        Returns:
            SafetyResult with safety level and details
        """
        triggered_rules = []
        
        # Rule 1: Check for emergency symptoms
        if self._check_emergency_symptoms(symptoms):
            triggered_rules.append("Emergency symptoms detected")
            return SafetyResult(
                safety_level=SafetyLevel.RED,
                safety_notes="⚠️ EMERGENCY: Symptoms suggest immediate medical attention needed. Call emergency services or go to nearest emergency room.",
                triggered_rules=triggered_rules,
                requires_immediate_care=True
            )
        
        # Rule 2: Check red flags from diagnostic plan
        if red_flags and len(red_flags) > 0:
            # Check if red flags contain emergency language
            for flag in red_flags:
                if any(emergency in flag.lower() for emergency in ['emergency', 'immediate', 'urgent', '911']):
                    triggered_rules.append("Critical red flags in diagnostic plan")
                    return SafetyResult(
                        safety_level=SafetyLevel.RED,
                        safety_notes="⚠️ URGENT: Assessment identified concerning symptoms requiring prompt medical evaluation.",
                        triggered_rules=triggered_rules,
                        requires_immediate_care=True
                    )
        
        # Rule 3: High-risk age group with concerning symptoms
        if self._check_high_risk_age_group(age, symptoms):
            triggered_rules.append(f"High-risk age group (age {age}) with concerning symptoms")
            if age < self.HIGH_RISK_INFANT_AGE:
                return SafetyResult(
                    safety_level=SafetyLevel.RED,
                    safety_notes="⚠️ INFANT EMERGENCY: Any significant symptoms in infants under 2 require immediate pediatric evaluation.",
                    triggered_rules=triggered_rules,
                    requires_immediate_care=True
                )
            else:
                return SafetyResult(
                    safety_level=SafetyLevel.AMBER,
                    safety_notes="⚠️ CAUTION: Age-related risk factors present. Recommend prompt medical evaluation.",
                    triggered_rules=triggered_rules,
                    requires_immediate_care=False
                )
        
        # Rule 4: Low confidence on potentially serious symptoms
        if confidence < self.LOW_CONFIDENCE_THRESHOLD:
            triggered_rules.append(f"Low confidence ({confidence:.0%}) on assessment")
            if self._has_potentially_serious_symptoms(symptoms):
                return SafetyResult(
                    safety_level=SafetyLevel.AMBER,
                    safety_notes="⚠️ UNCERTAIN ASSESSMENT: Confidence is low. Professional medical evaluation strongly recommended.",
                    triggered_rules=triggered_rules,
                    requires_immediate_care=False
                )
            else:
                return SafetyResult(
                    safety_level=SafetyLevel.AMBER,
                    safety_notes="Assessment confidence is limited. Consider consulting healthcare provider if symptoms persist or worsen.",
                    triggered_rules=triggered_rules,
                    requires_immediate_care=False
                )
        
        # Rule 5: Medium confidence - caution advised
        if confidence < self.MEDIUM_CONFIDENCE_THRESHOLD:
            triggered_rules.append(f"Medium confidence ({confidence:.0%})")
            return SafetyResult(
                safety_level=SafetyLevel.AMBER,
                safety_notes="Moderate confidence assessment. Monitor symptoms and seek care if  condition changes.",
                triggered_rules=triggered_rules,
                requires_immediate_care=False
            )
        
        # Rule 6: Check for conflicting signals
        if self._check_conflicting_signals(assessment, symptoms, confidence):
            triggered_rules.append("Conflicting signals detected between assessment and symptoms")
            return SafetyResult(
                safety_level=SafetyLevel.AMBER,
                safety_notes="Assessment contains some uncertainty. Recommend clinical evaluation for definitive diagnosis.",
                triggered_rules=triggered_rules,
                requires_immediate_care=False
            )
        
        # GREEN: High confidence, no red flags, appropriate age group
        triggered_rules.append(f"High confidence ({confidence:.0%}), no emergency symptoms")
        return SafetyResult(
            safety_level=SafetyLevel.GREEN,
            safety_notes="Assessment based on available information. Always consult healthcare provider for persistent or worsening symptoms.",
            triggered_rules=triggered_rules,
            requires_immediate_care=False
        )
    
    def _check_emergency_symptoms(self, symptoms: List[str]) -> bool:
        """Check if any symptoms are emergencies."""
        symptoms_lower = [s.lower() for s in symptoms]
        for symptom in symptoms_lower:
            for emergency in self.EMERGENCY_SYMPTOMS:
                if emergency in symptom:
                    logger.warning(f"Emergency symptom detected: {symptom}")
                    return True
        return False
    
    def _check_high_risk_age_group(self, age: int, symptoms: List[str]) -> bool:
        """Check if patient is in high-risk age group with concerning symptoms."""
        # Infants (under 2)
        if age < self.HIGH_RISK_INFANT_AGE:
            # Any significant symptoms in infants are concerning
            concerning_infant_symptoms = ['fever', 'vomiting', 'diarrhea', 'not feeding', 'lethargic', 'rash']
            symptoms_lower = [s.lower() for s in symptoms]
            for symptom in symptoms_lower:
                if any(concern in symptom for concern in concerning_infant_symptoms):
                    return True
        
        # Elderly (over 75)
        if age > self.HIGH_RISK_ELDERLY_AGE:
            # Falls, confusion, chest symptoms are high-risk
            high_risk_elderly_symptoms = ['fall', 'fell', 'confusion', 'chest', 'dizzy', 'weakness']
            symptoms_lower = [s.lower() for s in symptoms]
            for symptom in symptoms_lower:
                if any(risk in symptom for risk in high_risk_elderly_symptoms):
                    return True
        
        return False
    
    def _has_potentially_serious_symptoms(self, symptoms: List[str]) -> bool:
        """Check if symptoms could indicate serious conditions."""
        serious_indicators = [
            'pain', 'fever', 'bleeding', 'swelling', 'numbness',
            'vision', 'hearing', 'balance', 'weakness', 'severe'
        ]
        symptoms_lower = [s.lower() for s in symptoms]
        for symptom in symptoms_lower:
            if any(serious in symptom for serious in serious_indicators):
                return True
        return False
    
    def _check_conflicting_signals(
        self,
        assessment: str,
        symptoms: List[str],
        confidence: float
    ) -> bool:
        """Check for conflicting signals between assessment and inputs."""
        assessment_lower = assessment.lower()
        
        # High confidence but uncertain language
        if confidence >= 0.75:
            uncertain_phrases = [
                'unclear', 'uncertain', 'difficult to determine',
                'may be', 'could be', 'possibly', 'unable to determine',
                'requires further evaluation', 'needs more information'
            ]
            if any(phrase in assessment_lower for phrase in uncertain_phrases):
                return True
        
        # Multiple symptoms but very simple assessment
        if len(symptoms) >= 4 and len(assessment) < 100:
            return True
        
        return False
