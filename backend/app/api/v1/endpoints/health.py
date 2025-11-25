"""
Health assessment endpoints.

Provides endpoints for health assessment, symptom analysis, and medical report generation.
"""

from typing import Any, Dict
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.health import (
    HealthAssessmentRequest,
    HealthReport,
    Feeling,
    SymptomAssessment,
    PatientInfo,
    MedicalHistory
)
from app.services.health_assessment_simple import SimpleHealthAssessmentService
from app.core.logging import get_logger

# Create router
router = APIRouter()

# Get logger
logger = get_logger(__name__)


@router.post(
    "/assess",
    response_model=HealthReport,
    summary="Generate Health Assessment Report",
    description="""
    Generate a comprehensive health assessment report based on patient symptoms and medical history.

    This endpoint uses advanced AI agents to analyze symptoms, provide medical assessments,
    and generate personalized health recommendations.
    """
)
async def assess_health(
    *,
    background_tasks: BackgroundTasks,
    request: HealthAssessmentRequest,
) -> Any:
    """
    Generate health assessment report.

    Args:
        db: Database session
        background_tasks: FastAPI background tasks
        request: Health assessment request data

    Returns:
        HealthReport: Generated health assessment report

    Raises:
        HTTPException: If assessment fails
    """
    try:
        logger.info(f"Processing health assessment request for patient age {request.patient_info.age}")

        # Initialize simple health assessment service
        assessment_service = SimpleHealthAssessmentService()

        # Generate assessment report
        report = await assessment_service.generate_assessment(request)

        # Add background task for analytics/logging
        background_tasks.add_task(
            assessment_service.log_assessment_metrics,
            report.id,
            request
        )

        logger.info(f"Successfully generated health report {report.id}")
        return report

    except Exception as e:
        logger.error(f"Failed to generate health assessment: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate health assessment. Please try again."
        )


@router.get(
    "/symptoms/suggestions",
    summary="Get Symptom Suggestions",
    description="Get AI-powered symptom suggestions based on initial symptoms and patient context."
)
async def get_symptom_suggestions(
    symptoms: str,
    age: int,
    gender: str = None,
    medical_history: str = None,
) -> Dict[str, Any]:
    """
    Get symptom suggestions based on reported symptoms.

    Args:
        symptoms: Comma-separated list of current symptoms
        age: Patient age
        gender: Patient gender (optional)
        medical_history: Relevant medical history (optional)

    Returns:
        Dict containing suggested additional symptoms to consider
    """
    try:
        logger.info(f"Getting symptom suggestions for age {age}")

        assessment_service = SimpleHealthAssessmentService()

        suggestions = await assessment_service.get_symptom_suggestions(
            symptoms=symptoms,
            age=age,
            gender=gender,
            medical_history=medical_history
        )

        return {
            "suggestions": suggestions,
            "confidence": "high" if len(suggestions) > 0 else "low"
        }

    except Exception as e:
        logger.error(f"Failed to get symptom suggestions: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate symptom suggestions."
        )


@router.post(
    "/validate-symptoms",
    summary="Validate Symptom Data",
    description="Validate and normalize symptom data before assessment."
)
async def validate_symptoms(
    symptom_data: SymptomAssessment,
) -> Dict[str, Any]:
    """
    Validate symptom assessment data.

    Args:
        symptom_data: Symptom assessment data to validate

    Returns:
        Dict containing validation results and normalized data
    """
    try:
        logger.info("Validating symptom data")

        assessment_service = SimpleHealthAssessmentService()

        validation_result = await assessment_service.validate_symptoms(symptom_data)

        return validation_result

    except Exception as e:
        logger.error(f"Failed to validate symptoms: {e}", exc_info=True)
        raise HTTPException(
            status_code=400,
            detail="Invalid symptom data provided."
        )


@router.get(
    "/emergency-check",
    summary="Emergency Symptom Check",
    description="Check if reported symptoms require immediate medical attention."
)
async def check_emergency_symptoms(
    symptoms: str,
    age: int,
    additional_context: str = None,
) -> Dict[str, Any]:
    """
    Check if symptoms indicate a medical emergency.

    Args:
        symptoms: Comma-separated list of symptoms
        age: Patient age
        additional_context: Additional context about symptoms

    Returns:
        Dict containing emergency assessment and recommendations
    """
    try:
        logger.warning(f"Emergency check requested for symptoms: {symptoms}")

        assessment_service = SimpleHealthAssessmentService()

        emergency_assessment = await assessment_service.assess_emergency(
            symptoms=symptoms,
            age=age,
            context=additional_context
        )

        return emergency_assessment

    except Exception as e:
        logger.error(f"Failed to assess emergency symptoms: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to assess emergency symptoms."
        )