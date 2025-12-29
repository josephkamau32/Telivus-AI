"""
Test helper functions for validation and categorization.

These functions provide shared validation logic used by both tests and application code.
"""

from typing import Dict, Any


def validate_symptom_severity(severity_dict: Dict[str, int]) -> bool:
    """
    Validate that all symptom severities are within valid range (1-10).
    
    Args:
        severity_dict: Dictionary mapping symptom names to severity scores
        
    Returns:
        True if all severities are valid, False otherwise
    """
    if not severity_dict:
        return True
    
    for symptom, severity in severity_dict.items():
        if not isinstance(severity, (int, float)):
            return False
        if severity < 1 or severity > 10:
            return False
    
    return True


def categorize_symptoms(symptoms: list) -> Dict[str, Any]:
    """
    Categorize symptoms as common, serious, or emergency.
    
    Args:
        symptoms: List of symptom strings
        
    Returns:
        Dictionary with category and details
    """
    if not symptoms:
        return {"category": "none", "risk_level": "low"}
    
    # Emergency symptoms (require immediate medical attention)
    emergency_keywords = [
        "chest pain", "difficulty breathing", "severe bleeding",
        "severe headache", "confusion", "unconscious", "seizure",
        "severe burn", "paralysis", "stroke symptoms"
    ]
    
    # Serious symptoms (require medical attention soon)
    serious_keywords = [
        "high fever", "severe pain", "persistent vomiting",
        "blood in stool", "blood in urine", "severe diarrhea",
        "rapid heartbeat", "difficulty swallowing"
    ]
    
    # Check for emergency symptoms
    symptoms_lower = [s.lower() for s in symptoms]
    for emergency in emergency_keywords:
        if any(emergency in symptom for symptom in symptoms_lower):
            return {
                "category": "emergency",
                "risk_level": "critical",
                "action": "Seek immediate medical attention"
            }
    
    # Check for serious symptoms
    for serious in serious_keywords:
        if any(serious in symptom for symptom in symptoms_lower):
            return {
                "category": "serious",
                "risk_level": "high",
                "action": "Consult a doctor within 24 hours"
            }
    
    # Common symptoms
    return {
        "category": "common",
        "risk_level": "low",
        "action": "Monitor symptoms and self-care"
    }


def validate_assessment_structure(assessment: Dict[str, Any]) -> bool:
    """
    Validate that an assessment has the required structure.
    
    Args:
        assessment: Assessment dictionary to validate
        
    Returns:
        True if structure is valid
        
    Raises:
        ValueError: If structure is invalid
    """
    required_fields = [
        "patient_info",
        "medical_assessment",
        "confidence_score",
        "generated_at"
    ]
    
    for field in required_fields:
        if field not in assessment:
            raise ValueError(f"Missing required field: {field}")
    
    # Validate medical assessment subfields
    medical_required = [
        "chief_complaint",
        "assessment",
        "diagnostic_plan",
        "otc_recommendations",
        "lifestyle_recommendations"
    ]
    
    medical_assessment = assessment.get("medical_assessment", {})
    for field in medical_required:
        if field not in medical_assessment:
            raise ValueError(f"Missing medical assessment field: {field}")
    
    return True


def calculate_confidence_score(
    symptoms: list,
    symptom_count: int,
    medical_history_provided: bool
) -> float:
    """
    Calculate confidence score for an assessment.
    
    Args:
        symptoms: List of symptoms
        symptom_count: Number of symptoms
        medical_history_provided: Whether medical history was provided
        
    Returns:
        Confidence score between 0 and 1
    """
    base_score = 0.5
    
    # More symptoms = higher confidence
    if symptom_count >= 3:
        base_score += 0.2
    elif symptom_count >= 2:
        base_score += 0.1
    
    # Medical history provided = higher confidence
    if medical_history_provided:
        base_score += 0.15
    
    # Specific, detailed symptoms = higher confidence
    if symptoms and any(len(s) > 10 for s in symptoms):
        base_score += 0.1
    
    # Cap at 0.95 (never 100% certain)
    return min(base_score, 0.95)
