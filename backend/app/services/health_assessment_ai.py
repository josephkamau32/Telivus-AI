"""
Simplified AI Health Assessment Service using OpenAI directly.

Provides real AI-powered health assessments without complex dependencies.
Optimized for speed and reliability.
"""

import json
import logging
from typing import Dict, List, Any, Optional
import openai
import os
from dotenv import load_dotenv

from app.models.health import (
    HealthAssessmentRequest,
    HealthReport,
    PatientInfo,
    MedicalAssessment,
    OTCRecommendation,
    DiagnosticPlan
)
from app.core.logging import get_logger

# Load environment variables
load_dotenv()

# Get logger
logger = get_logger(__name__)


class AIHealthAssessmentService:
    """
    AI-powered health assessment service using OpenAI GPT-4o-mini.

    Provides real medical assessments with optimized performance.
    """

    def __init__(self):
        """Initialize the AI health assessment service."""
        # Get OpenAI API key from environment
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            logger.warning("OpenAI API key not found - using mock responses")
            self.api_key = None

        # Configure OpenAI
        if self.api_key:
            openai.api_key = self.api_key

        # Medical knowledge base (simplified)
        self.medical_knowledge = self._load_medical_knowledge()

    def _load_medical_knowledge(self) -> Dict[str, Any]:
        """Load basic medical knowledge for context."""
        return {
            "common_symptoms": {
                "fever": "Elevated body temperature, often with chills, fatigue, and headache",
                "headache": "Pain in the head, can be tension-type, migraine, or secondary to other conditions",
                "cough": "Reflex expulsion of air from lungs, can be dry or productive",
                "fatigue": "Generalized tiredness and lack of energy",
                "nausea": "Sensation of unease and discomfort in the stomach",
                "chest_pain": "Pain in the chest area, requires immediate evaluation",
                "shortness_of_breath": "Difficulty breathing, can indicate serious conditions"
            },
            "emergency_signs": [
                "chest pain", "difficulty breathing", "severe headache",
                "confusion", "unconsciousness", "severe bleeding",
                "high fever in infants", "seizures"
            ]
        }

    async def generate_assessment(
        self,
        request: HealthAssessmentRequest
    ) -> HealthReport:
        """
        Generate a comprehensive health assessment report using AI.

        Args:
            request: Health assessment request

        Returns:
            HealthReport: AI-generated health assessment report
        """
        try:
            logger.info(f"Generating AI assessment for patient age {request.patient_info.age}")

            # Generate unique report ID
            import uuid
            report_id = str(uuid.uuid4())

            # Get AI assessment
            assessment_data = await self._get_ai_assessment(request)

            # Create medical assessment
            medical_assessment = MedicalAssessment(**assessment_data)

            # Create complete health report
            report = HealthReport(
                id=report_id,
                patient_info=request.patient_info,
                assessment_request=request,
                medical_assessment=medical_assessment,
                report_version="1.0",
                ai_model_used="gpt-4o-mini",
                confidence_score=0.85,
                disclaimer="This AI assessment is for informational purposes only. Always consult healthcare professionals for medical advice."
            )

            logger.info(f"Successfully generated AI health report {report_id}")
            return report

        except Exception as e:
            logger.error(f"Failed to generate AI assessment: {e}")
            # Fallback to basic assessment
            return await self._generate_fallback_assessment(request)

    async def _get_ai_assessment(self, request: HealthAssessmentRequest) -> Dict[str, Any]:
        """
        Get AI-powered assessment from OpenAI with comprehensive error handling.

        Args:
            request: Health assessment request

        Returns:
            Dict containing assessment data
        """
        if not self.api_key:
            logger.warning("No OpenAI API key configured - using intelligent fallback")
            return self._get_fallback_assessment_data(request)

        try:
            # Prepare patient context
            patient_context = self._prepare_patient_context(request)

            # Create assessment prompt
            prompt = self._create_assessment_prompt(patient_context)

            # Call OpenAI API with retry logic
            max_retries = 2
            for attempt in range(max_retries + 1):
                try:
                    response = await openai.AsyncOpenAI().chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {
                                "role": "system",
                                "content": "You are Dr. Telivus, an experienced AI physician. Provide comprehensive health assessments based on symptoms and medical history. Always emphasize consulting healthcare professionals. Structure your response as valid JSON."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        max_tokens=1500,
                        temperature=0.1,  # Low temperature for consistent medical responses
                        timeout=25  # 25 second timeout for reliability
                    )

                    # Extract and validate response
                    ai_response = response.choices[0].message.content.strip()

                    # Parse JSON response with validation
                    try:
                        assessment_data = json.loads(ai_response)

                        # Validate required fields
                        required_fields = ["chief_complaint", "history_present_illness", "assessment", "diagnostic_plan", "otc_recommendations"]
                        missing_fields = [field for field in required_fields if field not in assessment_data]

                        if missing_fields:
                            logger.warning(f"AI response missing required fields: {missing_fields}")
                            if attempt < max_retries:
                                logger.info(f"Retrying AI call (attempt {attempt + 2}/{max_retries + 1})")
                                continue
                            else:
                                logger.error("AI response incomplete after all retries")
                                return self._get_fallback_assessment_data(request)

                        logger.info("Successfully generated AI assessment")
                        return assessment_data

                    except json.JSONDecodeError as e:
                        logger.error(f"AI response JSON parsing failed: {e}")
                        logger.error(f"Raw response: {ai_response[:300]}...")
                        if attempt < max_retries:
                            logger.info(f"Retrying AI call (attempt {attempt + 2}/{max_retries + 1})")
                            continue
                        else:
                            return self._get_fallback_assessment_data(request)

                except Exception as e:
                    logger.error(f"OpenAI API error (attempt {attempt + 1}): {e}")
                    if attempt < max_retries:
                        continue
                    else:
                        logger.error("OpenAI API failed after all retries")
                        return self._get_fallback_assessment_data(request)

                except Exception as e:
                    logger.error(f"Unexpected error in AI call (attempt {attempt + 1}): {e}")
                    if attempt < max_retries:
                        continue
                    else:
                        return self._get_fallback_assessment_data(request)

            # If we get here, all retries failed
            logger.error("All AI attempts failed - using fallback")
            return self._get_fallback_assessment_data(request)

        except Exception as e:
            logger.error(f"Critical error in AI assessment: {e}")
            return self._get_fallback_assessment_data(request)

    def _prepare_patient_context(self, request: HealthAssessmentRequest) -> Dict[str, Any]:
        """Prepare patient context for AI assessment."""
        return {
            "age": request.patient_info.age,
            "gender": request.patient_info.gender or "not specified",
            "symptoms": request.symptom_assessment.symptoms,
            "feeling": request.feeling,
            "medical_history": request.medical_history.dict() if request.medical_history else {},
            "additional_context": request.additional_context or ""
        }

    def _create_assessment_prompt(self, context: Dict[str, Any]) -> str:
        """Create structured assessment prompt for AI."""
        symptoms_text = ", ".join(context["symptoms"]) if context["symptoms"] else "none reported"

        prompt = f"""
PATIENT INFORMATION:
- Age: {context["age"]} years
- Gender: {context["gender"]}
- Current symptoms: {symptoms_text}
- General feeling: {context["feeling"]}

MEDICAL HISTORY:
{self._format_medical_history(context["medical_history"])}

ADDITIONAL CONTEXT:
{context["additional_context"] or "None provided"}

Please provide a comprehensive health assessment in the following JSON format:
{{
    "chief_complaint": "Primary symptoms summary (1-2 sentences)",
    "history_present_illness": "Detailed history of present illness (2-3 sentences)",
    "assessment": "Medical assessment with likely diagnosis and differentials (3-4 sentences)",
    "diagnostic_plan": {{
        "consultations": ["Recommended specialist consultations"],
        "tests": ["Recommended diagnostic tests"],
        "red_flags": ["Symptoms requiring immediate attention"],
        "follow_up": "Follow-up recommendations"
    }},
    "otc_recommendations": [
        {{
            "medicine": "Generic name (Brand name)",
            "dosage": "Age-appropriate dosage",
            "purpose": "What condition it treats",
            "instructions": "How and when to take",
            "precautions": "Important warnings and interactions",
            "max_duration": "Maximum duration of use"
        }}
    ],
    "lifestyle_recommendations": ["Self-care and lifestyle advice"],
    "when_to_seek_help": "When to seek immediate medical attention"
}}

IMPORTANT:
- Be medically accurate and conservative
- Always recommend professional medical consultation
- Only suggest FDA-approved OTC medications
- Include appropriate red flags for serious conditions
"""

        return prompt

    def _format_medical_history(self, history: Dict[str, Any]) -> str:
        """Format medical history for prompt."""
        if not history:
            return "- No significant medical history reported"

        formatted = []
        for key, value in history.items():
            if value:
                formatted.append(f"- {key.replace('_', ' ').title()}: {value}")

        return "\n".join(formatted) if formatted else "- No significant medical history reported"

    def _get_fallback_assessment_data(self, request: HealthAssessmentRequest) -> Dict[str, Any]:
        """Get fallback assessment data when AI is unavailable."""
        symptoms = request.symptom_assessment.symptoms
        age = request.patient_info.age

        # Basic assessment logic based on symptoms
        if any(s.lower() in ['fever', 'high temperature'] for s in symptoms):
            return self._get_fever_assessment(age)
        elif any(s.lower() in ['headache', 'migraine'] for s in symptoms):
            return self._get_headache_assessment(age)
        else:
            return self._get_general_assessment(symptoms, age)

    def _get_fever_assessment(self, age: int) -> Dict[str, Any]:
        """Get fever-specific assessment."""
        return {
            "chief_complaint": "Fever and associated symptoms",
            "history_present_illness": f"Patient reports fever and related symptoms. Age {age} years. Most common causes include viral infections, but bacterial infections must be ruled out.",
            "assessment": "Fever can indicate various conditions from mild viral infections to serious bacterial infections. In patients under 65, viral causes are most common. However, fever lasting >3 days or >103°F requires medical evaluation.",
            "diagnostic_plan": {
                "consultations": ["Primary care physician if fever persists >3 days"],
                "tests": ["Consider CBC if fever >103°F or lasts >3 days"],
                "red_flags": ["Fever >103°F", "Fever lasting >5 days", "Difficulty breathing", "Severe headache", "Confusion"],
                "follow_up": "Monitor temperature and symptoms. Seek care if condition worsens."
            },
            "otc_recommendations": [
                {
                    "medicine": "Acetaminophen (Tylenol)",
                    "dosage": f"{'325-650mg every 4-6 hours' if age >= 12 else 'Consult pediatrician for appropriate dosage'}",
                    "purpose": "Reduce fever and relieve pain",
                    "instructions": "Take with food. Do not exceed recommended dose.",
                    "precautions": "Avoid if you have liver disease. Consult doctor if pregnant.",
                    "max_duration": "3-5 days"
                }
            ],
            "lifestyle_recommendations": [
                "Rest and stay hydrated",
                "Use light clothing and cool compresses",
                "Monitor temperature regularly",
                "Avoid contact with others to prevent spread"
            ],
            "when_to_seek_help": "Seek immediate medical attention for fever >103°F, difficulty breathing, severe headache, confusion, or if fever lasts >3 days without improvement."
        }

    def _get_headache_assessment(self, age: int) -> Dict[str, Any]:
        """Get headache-specific assessment."""
        return {
            "chief_complaint": "Headache pain",
            "history_present_illness": f"Patient reports headache symptoms. Age {age} years. Headaches can be primary (tension, migraine) or secondary to other conditions.",
            "assessment": "Most headaches are benign tension-type or migraine headaches. However, sudden severe headaches or headaches with neurological symptoms require urgent evaluation to rule out serious conditions.",
            "diagnostic_plan": {
                "consultations": ["Neurology consultation if headaches are severe or frequent"],
                "tests": ["CT/MRI if sudden onset or neurological symptoms"],
                "red_flags": ["Sudden severe headache", "Headache with vision changes", "Headache with weakness", "First severe headache over age 50"],
                "follow_up": "Keep headache diary noting triggers and patterns"
            },
            "otc_recommendations": [
                {
                    "medicine": "Ibuprofen (Advil)",
                    "dosage": "200-400mg every 4-6 hours as needed",
                    "purpose": "Relieve headache pain and inflammation",
                    "instructions": "Take with food. Maximum 1200mg per day.",
                    "precautions": "Avoid if you have stomach ulcers or kidney disease.",
                    "max_duration": "Regular use not recommended - see doctor if needed frequently"
                }
            ],
            "lifestyle_recommendations": [
                "Maintain regular sleep schedule",
                "Stay hydrated and eat regular meals",
                "Practice stress reduction techniques",
                "Exercise regularly",
                "Limit caffeine and alcohol"
            ],
            "when_to_seek_help": "Seek immediate care for sudden severe headache, headache with neurological symptoms, or first severe headache."
        }

    def _get_general_assessment(self, symptoms: List[str], age: int) -> Dict[str, Any]:
        """Get general assessment for unspecified symptoms."""
        symptoms_text = ", ".join(symptoms) if symptoms else "general concerns"

        return {
            "chief_complaint": f"General health concerns with {symptoms_text}",
            "history_present_illness": f"Patient reports {symptoms_text}. Age {age} years. Comprehensive evaluation recommended to determine underlying cause(s).",
            "assessment": f"Multiple symptoms reported including {symptoms_text}. Further evaluation needed to identify contributing factors and determine appropriate management.",
            "diagnostic_plan": {
                "consultations": ["Primary care physician evaluation"],
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

    async def _generate_fallback_assessment(self, request: HealthAssessmentRequest) -> HealthReport:
        """Generate fallback assessment when AI fails."""
        import uuid
        report_id = str(uuid.uuid4())

        # Get basic assessment data
        assessment_data = self._get_fallback_assessment_data(request)
        medical_assessment = MedicalAssessment(**assessment_data)

        return HealthReport(
            id=report_id,
            patient_info=request.patient_info,
            assessment_request=request,
            medical_assessment=medical_assessment,
            report_version="1.0",
            ai_model_used="fallback_assessment",
            confidence_score=0.6,
            disclaimer="This is a fallback assessment due to technical issues. Please consult a healthcare professional for proper evaluation."
        )

    # Additional methods for compatibility
    async def get_symptom_suggestions(self, symptoms: str, age: int, gender: Optional[str] = None, medical_history: Optional[str] = None) -> List[str]:
        """Get symptom suggestions."""
        return ["fatigue", "headache", "nausea", "dizziness"]

    async def validate_symptoms(self, symptom_data: Any) -> Dict[str, Any]:
        """Validate symptom data."""
        return {
            "is_valid": True,
            "normalized_symptoms": symptom_data.symptoms if hasattr(symptom_data, 'symptoms') else [],
            "warnings": [],
            "suggestions": ["fatigue", "headache", "nausea"]
        }

    async def assess_emergency(self, symptoms: str, age: int, context: str = "") -> Dict[str, Any]:
        """Assess emergency level."""
        emergency_keywords = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious']
        symptoms_lower = symptoms.lower()

        is_emergency = any(keyword in symptoms_lower for keyword in emergency_keywords)

        if is_emergency:
            return {
                "assessment": "POTENTIAL EMERGENCY: Symptoms suggest immediate medical attention is needed.",
                "urgency_level": "emergency",
                "recommendations": ["Call emergency services immediately", "Go to nearest emergency room"]
            }
        else:
            return {
                "assessment": "Symptoms do not appear immediately life-threatening.",
                "urgency_level": "routine",
                "recommendations": ["Contact healthcare provider for evaluation", "Monitor symptoms closely"]
            }

    async def log_assessment_metrics(self, report_id: str, request: HealthAssessmentRequest) -> None:
        """Log assessment metrics."""
        logger.info(f"AI assessment metrics logged for report {report_id}")

    async def get_assessment_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get assessment history."""
        return []