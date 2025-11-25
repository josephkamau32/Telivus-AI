"""
Simple health assessment service for basic functionality.

This provides mock responses for testing API endpoints without requiring
complex AI dependencies. In production, this would be replaced with
the full AI-powered service.
"""

from typing import Dict, List, Any, Optional
import uuid
import logging
from datetime import datetime

from app.models.health import (
    HealthAssessmentRequest,
    HealthReport,
    PatientInfo,
    MedicalAssessment,
    OTCRecommendation,
    DiagnosticPlan
)
from app.core.logging import get_logger

# Get logger
logger = get_logger(__name__)


class SimpleHealthAssessmentService:
    """
    Simple health assessment service with mock responses.

    This service provides basic functionality for testing and development
    without requiring complex AI dependencies.
    """

    def __init__(self):
        """Initialize the simple health assessment service."""
        self.mock_responses = self._load_mock_responses()

    def _load_mock_responses(self) -> Dict[str, Any]:
        """Load mock assessment responses for different symptoms."""
        return {
            "fever": {
                "chief_complaint": "Fever and general malaise",
                "history_present_illness": "Patient reports fever up to 101°F for 2 days, accompanied by fatigue and mild headache. No cough, rash, or other associated symptoms reported.",
                "assessment": "Viral upper respiratory infection. Common cold or influenza-like illness. No red flags for serious bacterial infection.",
                "diagnostic_plan": {
                    "consultations": [],
                    "tests": ["Consider rapid strep test if symptoms persist"],
                    "red_flags": ["Fever >103°F", "Fever lasting >5 days", "Difficulty breathing", "Severe headache"],
                    "follow_up": "Return if symptoms worsen or persist beyond 5 days"
                },
                "otc_recommendations": [
                    {
                        "medicine": "Acetaminophen (Tylenol)",
                        "dosage": "500-1000mg every 4-6 hours as needed",
                        "purpose": "Reduce fever and relieve pain",
                        "instructions": "Take with food. Do not exceed 3000mg per day.",
                        "precautions": "Avoid if you have liver disease. Consult doctor if pregnant.",
                        "max_duration": "5-7 days"
                    },
                    {
                        "medicine": "Ibuprofen (Advil)",
                        "dosage": "200-400mg every 4-6 hours as needed",
                        "purpose": "Reduce fever and inflammation",
                        "instructions": "Take with food. Do not exceed 1200mg per day.",
                        "precautions": "Avoid if you have stomach ulcers or kidney disease.",
                        "max_duration": "3-5 days"
                    }
                ],
                "lifestyle_recommendations": [
                    "Rest and stay hydrated",
                    "Use humidifier to ease congestion",
                    "Avoid contact with others to prevent spread"
                ],
                "when_to_seek_help": "Seek immediate medical attention if you develop difficulty breathing, chest pain, confusion, or if fever exceeds 103°F and doesn't respond to medication."
            },
            "headache": {
                "chief_complaint": "Recurrent headaches",
                "history_present_illness": "Patient reports moderate to severe headaches occurring 2-3 times per week. Headaches are throbbing in nature and located bilaterally.",
                "assessment": "Tension-type headache. Most common type of primary headache. Likely related to stress, poor posture, or muscle tension.",
                "diagnostic_plan": {
                    "consultations": ["Consider neurology consultation if headaches become more frequent or severe"],
                    "tests": [],
                    "red_flags": ["Sudden severe headache (thunderclap)", "Headache with neurological symptoms", "Headache in patients over 50 with new onset"],
                    "follow_up": "Track headache frequency and triggers in a diary"
                },
                "otc_recommendations": [
                    {
                        "medicine": "Ibuprofen (Advil)",
                        "dosage": "200-400mg every 4-6 hours as needed",
                        "purpose": "Relieve headache pain and inflammation",
                        "instructions": "Take with food. Maximum 1200mg per day.",
                        "precautions": "Avoid if you have stomach ulcers or bleeding disorders.",
                        "max_duration": "Regular use not recommended - see doctor if needed frequently"
                    }
                ],
                "lifestyle_recommendations": [
                    "Maintain regular sleep schedule",
                    "Stay hydrated and eat regular meals",
                    "Practice stress reduction techniques",
                    "Improve posture and ergonomics"
                ],
                "when_to_seek_help": "Seek immediate care for sudden severe headache, headache with vision changes, weakness, or confusion."
            },
            "default": {
                "chief_complaint": "General health concerns",
                "history_present_illness": "Patient reports various symptoms requiring medical evaluation. Detailed assessment recommended.",
                "assessment": "Multiple symptoms reported. Comprehensive evaluation needed to determine underlying cause(s).",
                "diagnostic_plan": {
                    "consultations": ["Primary care physician evaluation recommended"],
                    "tests": ["Basic metabolic panel", "Complete blood count"],
                    "red_flags": ["Severe pain", "Unexplained weight loss", "Persistent fever"],
                    "follow_up": "Schedule appointment with healthcare provider within 1-2 weeks"
                },
                "otc_recommendations": [],
                "lifestyle_recommendations": [
                    "Maintain healthy diet and regular exercise",
                    "Ensure adequate sleep and stress management",
                    "Stay current with preventive health screenings"
                ],
                "when_to_seek_help": "Contact healthcare provider if symptoms worsen or new symptoms develop."
            }
        }

    async def generate_assessment(
        self,
        request: HealthAssessmentRequest
    ) -> HealthReport:
        """
        Generate a health assessment report.

        Args:
            request: Health assessment request

        Returns:
            HealthReport: Generated health assessment report
        """
        try:
            logger.info(f"Generating simple assessment for patient age {request.patient_info.age}")

            # Generate unique report ID
            report_id = str(uuid.uuid4())

            # Get mock assessment based on symptoms
            assessment_data = self._get_mock_assessment(request.symptom_assessment.symptoms)

            # Create medical assessment
            medical_assessment = MedicalAssessment(**assessment_data)

            # Create complete health report
            report = HealthReport(
                id=report_id,
                patient_info=request.patient_info,
                assessment_request=request,
                medical_assessment=medical_assessment,
                report_version="1.0",
                ai_model_used="mock_assessment_service",
                confidence_score=0.8,  # Mock confidence score
                disclaimer="This is a mock assessment for demonstration purposes. Always consult healthcare professionals for actual medical advice."
            )

            logger.info(f"Successfully generated mock health report {report_id}")
            return report

        except Exception as e:
            logger.error(f"Failed to generate mock assessment: {e}")
            raise

    def _get_mock_assessment(self, symptoms: List[str]) -> Dict[str, Any]:
        """
        Get mock assessment data based on reported symptoms.

        Args:
            symptoms: List of reported symptoms

        Returns:
            Mock assessment data
        """
        # Simple logic to match symptoms to mock responses
        symptom_text = ' '.join(symptoms).lower()

        if 'fever' in symptom_text:
            return self.mock_responses["fever"]
        elif 'headache' in symptom_text or 'migraine' in symptom_text:
            return self.mock_responses["headache"]
        else:
            return self.mock_responses["default"]

    async def get_symptom_suggestions(
        self,
        symptoms: str,
        age: int,
        gender: Optional[str] = None,
        medical_history: Optional[str] = None
    ) -> List[str]:
        """
        Get symptom suggestions.

        Args:
            symptoms: Current symptoms
            age: Patient age
            gender: Patient gender
            medical_history: Medical history

        Returns:
            List of suggested symptoms
        """
        # Mock symptom suggestions
        base_suggestions = [
            "fatigue", "nausea", "dizziness", "chest pain",
            "shortness of breath", "abdominal pain", "rash"
        ]

        # Return first 3 suggestions
        return base_suggestions[:3]

    async def validate_symptoms(self, symptom_data: Any) -> Dict[str, Any]:
        """
        Validate symptom data.

        Args:
            symptom_data: Symptom assessment data

        Returns:
            Validation results
        """
        return {
            "is_valid": True,
            "normalized_symptoms": symptom_data.symptoms if hasattr(symptom_data, 'symptoms') else [],
            "warnings": [],
            "suggestions": ["fatigue", "headache", "nausea"]
        }

    async def assess_emergency(
        self,
        symptoms: str,
        age: int,
        context: str = ""
    ) -> Dict[str, Any]:
        """
        Assess emergency level.

        Args:
            symptoms: Symptoms description
            age: Patient age
            context: Additional context

        Returns:
            Emergency assessment
        """
        # Simple emergency assessment
        emergency_keywords = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious']

        symptoms_lower = symptoms.lower()
        is_emergency = any(keyword in symptoms_lower for keyword in emergency_keywords)

        if is_emergency:
            return {
                "assessment": "POTENTIAL EMERGENCY: Symptoms suggest immediate medical attention is needed.",
                "urgency_level": "emergency",
                "recommendations": [
                    "Call emergency services (911) immediately",
                    "Go to nearest emergency room",
                    "Do not drive yourself"
                ]
            }
        else:
            return {
                "assessment": "Symptoms do not appear immediately life-threatening.",
                "urgency_level": "routine",
                "recommendations": [
                    "Contact healthcare provider for evaluation",
                    "Monitor symptoms closely",
                    "Seek urgent care if symptoms worsen"
                ]
            }

    async def log_assessment_metrics(
        self,
        report_id: str,
        request: HealthAssessmentRequest
    ) -> None:
        """
        Log assessment metrics.

        Args:
            report_id: Report ID
            request: Assessment request
        """
        logger.info(f"Mock assessment metrics logged for report {report_id}")

    async def get_assessment_history(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get assessment history.

        Args:
            user_id: User ID
            limit: Maximum results

        Returns:
            List of assessment summaries
        """
        # Mock history
        return [
            {
                "id": "mock_report_1",
                "date": "2024-01-15",
                "symptoms": ["fever", "cough"],
                "assessment": "Viral infection"
            }
        ]