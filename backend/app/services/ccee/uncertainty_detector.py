"""
Uncertainty Detector for Clinical Confidence & Explainability Engine (CCEE).

Identifies uncertainty factors and suggests additional data that would
improve assessment confidence.
"""

from typing import List, Dict, Any
from dataclasses import dataclass
from app.models.health import HealthAssessmentRequest
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class UncertaintyFactor:
    """Factor contributing to uncertainty."""
    category: str  # "missing_data", "vague_symptoms", "conflicting_info"
    description: str
    impact: str  # e.g., "Reduces confidence by 15%"
    suggestion: str  # What data would help


class UncertaintyDetector:
    """
    Detects uncertainty and missing information in health assessments.
    
    Helps users understand what additional data would improve confidence.
    """
    
    def detect_uncertainty_factors(
        self,
        request: HealthAssessmentRequest,
        confidence_breakdown: Any
    ) -> List[UncertaintyFactor]:
        """
        Detect all uncertainty factors in the assessment.
        
        Args:
            request: The health assessment request
            confidence_breakdown: Confidence breakdown data
            
        Returns:
            List of UncertaintyFactor objects
        """
        factors = []
        
        # Check missing data
        factors.extend(self._check_missing_data(request))
        
        # Check vague symptoms
        factors.extend(self._check_vague_symptoms(request))
        
        # Check limited symptom information
        factors.extend(self._check_symptom_details(request))
        
        return factors
    
    def suggest_additional_data(
        self,
        request: HealthAssessmentRequest
    ) -> List[str]:
        """
        Suggest specific additional data that would improve assessment.
        
        Args:
            request: The health assessment request
            
        Returns:
            List of suggestions for data improvements
        """
        suggestions = []
        
        # Medical history
        if not request.medical_history or not self._has_meaningful_history(request.medical_history):
            suggestions.append("Provide past medical conditions, current medications, and known allergies")
        
        # Symptom severity
        if not hasattr(request.symptom_assessment, 'severity') or not request.symptom_assessment.severity:
            suggestions.append("Rate each symptom's severity on a scale of 1-10")
        
        # Symptom duration
        if not hasattr(request.symptom_assessment, 'duration') or not request.symptom_assessment.duration:
            suggestions.append("Specify how long each symptom has been present (e.g., '2 days', '1 week')")
        
        # Gender for age-related conditions
        if not request.patient_info.gender:
            suggestions.append("Provide gender for more accurate assessment of age-related conditions")
        
        # Additional context
        if not request.additional_context or len(request.additional_context.strip()) < 10:
            suggestions.append("Share relevant context (recent travel, known exposures, symptom triggers)")
        
        return suggestions[:5]  # Limit to top 5 suggestions
    
    def _check_missing_data(self, request: HealthAssessmentRequest) -> List[UncertaintyFactor]:
        """Check for missing data fields."""
        factors = []
        
        # Missing medical history
        if not request.medical_history or not self._has_meaningful_history(request.medical_history):
            factors.append(UncertaintyFactor(
                category="missing_data",
                description="No medical history provided",
                impact="Reduces confidence by approximately 15-30%",
                suggestion="Provide past medical conditions, medications, and known allergies for better context"
            ))
        
        # Missing gender
        if not request.patient_info.gender:
            factors.append(UncertaintyFactor(
                category="missing_data",
                description="Gender not specified",
                impact="Reduces confidence by approximately 5-10%",
                suggestion="Provide gender for more accurate assessment of gender-specific conditions"
            ))
        
        # Missing additional context
        if not request.additional_context or len(request.additional_context.strip()) < 10:
            factors.append(UncertaintyFactor(
                category="missing_data",
                description="Limited additional context",
                impact="May reduce confidence by 5-15% depending on symptoms",
                suggestion="Share relevant details like recent activities, known exposures, or symptom patterns"
            ))
        
        return factors
    
    def _check_vague_symptoms(self, request: HealthAssessmentRequest) -> List[UncertaintyFactor]:
        """Check for vague or non-specific symptoms."""
        factors = []
        
        symptoms = request.symptom_assessment.symptoms
        
        # Very generic symptoms
        vague_symptoms = ['tired', 'fatigue', 'unwell', 'sick', 'not feeling good', 'off']
        vague_count = sum(1 for s in symptoms if any(vague in s.lower() for vague in vague_symptoms))
        
        if vague_count > 0 and len(symptoms) <= 2:
            factors.append(UncertaintyFactor(
                category="vague_symptoms",
                description="Symptoms are non-specific",
                impact=f"Reduces confidence by approximately {min(vague_count * 10, 20)}%",
                suggestion="Describe specific symptoms (e.g., instead of 'tired', describe 'extreme exhaustion after minimal activity')"
            ))
        
        # Only one symptom reported
        if len(symptoms) == 1:
            factors.append(UncertaintyFactor(
                category="vague_symptoms",
                description="Only one symptom reported",
                impact="Reduces confidence by approximately 10-15%",
                suggestion="Report all associated symptoms, even if minor, for complete picture"
            ))
        
        return factors
    
    def _check_symptom_details(self, request: HealthAssessmentRequest) -> List[UncertaintyFactor]:
        """Check for missing symptom severity and duration."""
        factors = []
        
        symptoms = request.symptom_assessment.symptoms
        severity = getattr(request.symptom_assessment, 'severity', None)
        duration = getattr(request.symptom_assessment, 'duration', None)
        
        # Missing severity for all symptoms
        if not severity or len(severity) == 0:
            factors.append(UncertaintyFactor(
                category="missing_data",
                description="No symptom severity ratings provided",
                impact="Reduces confidence by approximately 10-20%",
                suggestion="Rate each symptom's severity on a scale of 1-10 to help prioritize concerns"
            ))
        # Missing severity for some symptoms
        elif len(severity) < len(symptoms):
            missing_count = len(symptoms) - len(severity)
            factors.append(UncertaintyFactor(
                category="missing_data",
                description=f"{missing_count} symptom(s) lack severity rating",
                impact=f"Reduces confidence by approximately {min(missing_count * 5, 15)}%",
                suggestion="Provide severity ratings for all symptoms"
            ))
        
        # Missing duration for all symptoms
        if not duration or len(duration) == 0:
            factors.append(UncertaintyFactor(
                category="missing_data",
                description="No symptom duration information",
                impact="Reduces confidence by approximately 10-20%",
                suggestion="Specify how long each symptom has been present (acute vs. chronic matters)"
            ))
        # Missing duration for some symptoms
        elif len(duration) < len(symptoms):
            missing_count = len(symptoms) - len(duration)
            factors.append(UncertaintyFactor(
                category="missing_data",
                description=f"{missing_count} symptom(s) lack duration information",
                impact=f"Reduces confidence by approximately {min(missing_count * 5, 15)}%",
                suggestion="Provide duration for all symptoms"
            ))
        
        return factors
    
    def _has_meaningful_history(self, history: Any) -> bool:
        """Check if medical history contains meaningful information."""
        if not history:
            return False
        
        # Check if any field has non-None/non-empty value
        if history.past_medical_conditions and len(history.past_medical_conditions) > 0:
            # Check if it's not just "None" or "No"
            conditions_str = str(history.past_medical_conditions).lower()
            if conditions_str not in ['none', '[]', 'no', 'n/a']:
                return True
        
        if history.current_medications and len(history.current_medications) > 0:
            meds_str = str(history.current_medications).lower()
            if meds_str not in ['none', '[]', 'no', 'n/a']:
                return True
        
        if history.allergies and len(history.allergies) > 0:
            allergies_str = str(history.allergies).lower()
            if allergies_str not in ['none', '[]', 'no', 'n/a']:
                return True
        
        return False
