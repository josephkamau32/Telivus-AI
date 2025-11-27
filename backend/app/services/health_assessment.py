"""
Health Assessment Service.

Provides high-level interface for health assessment operations using AI agents.
"""

from typing import Dict, List, Any, Optional
import uuid
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.health import (
    HealthAssessmentRequest,
    HealthReport,
    PatientInfo,
    MedicalHistory,
    SymptomAssessment
)
from app.core.logging import get_logger

# Get logger
logger = get_logger(__name__)

# Try to import AI service first (highest priority)
try:
    from app.services.health_assessment_ai import AIHealthAssessmentService
    _ai_service = AIHealthAssessmentService()
    _use_ai_service = True
except ImportError:
    _ai_service = None
    _use_ai_service = False

# Import simple service as fallback
try:
    from app.services.health_assessment_simple import SimpleHealthAssessmentService
    _simple_service = SimpleHealthAssessmentService()
    _use_simple_service = True
except ImportError:
    _simple_service = None
    _use_simple_service = False

# Try to import advanced agent (lowest priority)
try:
    from app.agents.health_assessment_agent import HealthAssessmentAgent
    _advanced_agent = HealthAssessmentAgent()
    _use_advanced_agent = True
except ImportError:
    _advanced_agent = None
    _use_advanced_agent = False


class HealthAssessmentService:
    """
    Service for handling health assessment operations.

    Coordinates between AI agents, data validation, and report generation.
    Uses advanced AI agents when available, falls back to simple mock service.
    """

    def __init__(self, db: Optional[AsyncSession] = None):
        """
        Initialize health assessment service.

        Args:
            db: Optional database session
        """
        self.db = db

        # Prioritize AI service, then advanced agent, then simple service
        if _use_ai_service:
            self.service = _ai_service
            self.service_type = "ai"
            logger.info("Using AI health assessment service (OpenAI GPT-4o-mini)")
        elif _use_advanced_agent:
            self.service = _advanced_agent
            self.service_type = "advanced"
            logger.info("Using advanced health assessment agent")
        elif _use_simple_service:
            self.service = _simple_service
            self.service_type = "simple"
            logger.info("Using simple health assessment service")
        else:
            raise RuntimeError("No health assessment service available")

    async def generate_assessment(
        self,
        request: HealthAssessmentRequest
    ) -> HealthReport:
        """
        Generate a complete health assessment report.

        Args:
            request: Health assessment request

        Returns:
            HealthReport: Complete health assessment report
        """
        try:
            logger.info(f"Generating {self.service_type} assessment for patient age {request.patient_info.age}")

            # Delegate to the appropriate service
            report = await self.service.generate_assessment(request)

            # Update metadata based on service type
            if self.service_type == "ai":
                report.ai_model_used = "gpt-4o-mini"
                report.confidence_score = 0.85
                report.disclaimer = "This AI assessment is for informational purposes only. Always consult healthcare professionals for medical advice."
            elif self.service_type == "simple":
                report.ai_model_used = "mock_assessment_service"
                report.confidence_score = 0.8
                report.disclaimer = "This is a mock assessment for demonstration purposes. Always consult healthcare professionals for actual medical advice."

            # Log assessment metrics
            await self.log_assessment_metrics(report.id, request)

            logger.info(f"Successfully generated {self.service_type} health report {report.id}")
            return report

        except Exception as e:
            logger.error(f"Failed to generate health assessment: {e}")
            raise

    async def get_symptom_suggestions(
        self,
        symptoms: str,
        age: int,
        gender: Optional[str] = None,
        medical_history: Optional[str] = None
    ) -> List[str]:
        """
        Get symptom suggestions based on reported symptoms.

        Args:
            symptoms: Comma-separated symptoms
            age: Patient age
            gender: Patient gender
            medical_history: Relevant medical history

        Returns:
            List of suggested additional symptoms
        """
        try:
            # Delegate to the service
            if hasattr(self.service, 'get_symptom_suggestions'):
                return await self.service.get_symptom_suggestions(symptoms, age, gender, medical_history)
            else:
                # Fallback mock suggestions
                return ["fatigue", "headache", "nausea", "dizziness", "chest pain"]

        except Exception as e:
            logger.error(f"Failed to get symptom suggestions: {e}")
            return []

    async def validate_symptoms(self, symptom_data: SymptomAssessment) -> Dict[str, Any]:
        """
        Validate and normalize symptom assessment data.

        Args:
            symptom_data: Symptom assessment to validate

        Returns:
            Dict containing validation results
        """
        try:
            validation_results = {
                "is_valid": True,
                "normalized_symptoms": [],
                "warnings": [],
                "suggestions": []
            }

            # Basic validation
            if not symptom_data.symptoms:
                validation_results["is_valid"] = False
                validation_results["warnings"].append("No symptoms provided")
                return validation_results

            # Normalize symptoms
            normalized = []
            for symptom in symptom_data.symptoms:
                # Basic normalization
                normalized_symptom = symptom.strip().lower()
                if normalized_symptom and normalized_symptom not in normalized:
                    normalized.append(normalized_symptom)

            validation_results["normalized_symptoms"] = normalized

            # Check for potential issues
            if len(normalized) > 10:
                validation_results["warnings"].append("Large number of symptoms reported - consider prioritizing main concerns")

            # Get suggestions for additional symptoms
            if len(normalized) > 0:
                suggestions = await self.get_symptom_suggestions(
                    symptoms=', '.join(normalized[:3]),  # Use first 3 symptoms
                    age=25  # Default age for suggestions
                )
                validation_results["suggestions"] = suggestions

            return validation_results

        except Exception as e:
            logger.error(f"Failed to validate symptoms: {e}")
            return {
                "is_valid": False,
                "error": "Validation failed",
                "message": str(e)
            }

    async def assess_emergency(
        self,
        symptoms: str,
        age: int,
        context: str = ""
    ) -> Dict[str, Any]:
        """
        Assess if symptoms require emergency medical attention.

        Args:
            symptoms: Description of symptoms
            age: Patient age
            context: Additional context

        Returns:
            Dict containing emergency assessment
        """
        try:
            # Delegate to the service
            if hasattr(self.service, 'assess_emergency'):
                return await self.service.assess_emergency(symptoms, age, context)
            else:
                # Fallback emergency assessment
                return {
                    "assessment": "Emergency assessment not available",
                    "urgency_level": "unknown",
                    "recommendations": ["Please consult a healthcare professional immediately"]
                }

        except Exception as e:
            logger.error(f"Failed to assess emergency: {e}")
            return {
                "assessment": "Unable to complete emergency assessment",
                "urgency_level": "unknown",
                "recommendations": ["Please consult a healthcare professional immediately"]
            }

    def _calculate_confidence_score(
        self,
        request: HealthAssessmentRequest,
        assessment: Any
    ) -> float:
        """
        Calculate confidence score for the assessment.

        Args:
            request: Original assessment request
            assessment: Generated medical assessment

        Returns:
            Float confidence score between 0.0 and 1.0
        """
        # Placeholder confidence calculation
        # In a real implementation, this would consider:
        # - Completeness of input data
        # - Clarity of symptoms
        # - Consistency of medical history
        # - Quality of AI response

        base_score = 0.7  # Base confidence

        # Adjust based on input completeness
        if request.medical_history:
            base_score += 0.1

        if request.patient_info.name:
            base_score += 0.05

        if len(request.symptom_assessment.symptoms) > 1:
            base_score += 0.1

        # Cap at 0.95
        return min(base_score, 0.95)

    async def log_assessment_metrics(
        self,
        report_id: str,
        request: HealthAssessmentRequest
    ) -> None:
        """
        Log assessment metrics for analytics.

        Args:
            report_id: Generated report ID
            request: Original assessment request
        """
        try:
            metrics = {
                "report_id": report_id,
                "timestamp": datetime.utcnow().isoformat(),
                "patient_age": request.patient_info.age,
                "symptom_count": len(request.symptom_assessment.symptoms),
                "has_medical_history": request.medical_history is not None,
                "processing_time_ms": 0  # Would be calculated in real implementation
            }

            logger.info(f"Assessment metrics: {metrics}")

            # In a real implementation, this would store metrics in database
            # await self._store_metrics(metrics)

        except Exception as e:
            logger.error(f"Failed to log assessment metrics: {e}")

    async def get_assessment_history(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get assessment history for a user.

        Args:
            user_id: User identifier
            limit: Maximum number of records to return

        Returns:
            List of assessment summaries
        """
        # Placeholder for assessment history
        # In a real implementation, this would query the database
        return []