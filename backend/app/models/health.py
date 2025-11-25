"""
Pydantic models for health assessment and medical reports.

These models define the structure for patient data, symptoms, assessments,
and medical reports used throughout the application.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class Feeling(str, Enum):
    """Patient's general feeling options."""
    GOOD = "good"
    UNWELL = "unwell"
    TIRED = "tired"
    ANXIOUS = "anxious"
    STRESSED = "stressed"


class Gender(str, Enum):
    """Patient gender options."""
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer-not-to-say"


class SymptomAssessment(BaseModel):
    """Model for symptom assessment data."""
    symptoms: List[str] = Field(..., min_items=1, description="List of reported symptoms")
    severity: Optional[Dict[str, int]] = Field(None, description="Severity rating for each symptom (1-10)")
    duration: Optional[Dict[str, str]] = Field(None, description="Duration for each symptom")
    additional_notes: Optional[str] = Field(None, max_length=1000, description="Additional symptom details")

    @validator('symptoms')
    def validate_symptoms(cls, v):
        """Validate that symptoms are not empty strings."""
        if not v or any(not symptom.strip() for symptom in v):
            raise ValueError('Symptoms cannot be empty')
        return [symptom.strip() for symptom in v]


class PatientInfo(BaseModel):
    """Model for basic patient information."""
    name: Optional[str] = Field(None, max_length=100, description="Patient's full name")
    age: int = Field(..., ge=0, le=130, description="Patient's age in years")
    gender: Optional[Gender] = Field(None, description="Patient's gender")
    contact_info: Optional[str] = Field(None, max_length=200, description="Contact information")


class MedicalHistory(BaseModel):
    """Model for patient's medical history."""
    past_medical_conditions: Optional[List[str]] = Field(None, description="Previous medical conditions")
    past_surgical_history: Optional[List[str]] = Field(None, description="Previous surgeries")
    current_medications: Optional[List[str]] = Field(None, description="Currently taking medications")
    allergies: Optional[List[str]] = Field(None, description="Known allergies")
    family_medical_history: Optional[Dict[str, List[str]]] = Field(None, description="Family medical history")


class HealthAssessmentRequest(BaseModel):
    """Request model for health assessment."""
    feeling: Feeling = Field(..., description="Patient's general feeling")
    symptom_assessment: SymptomAssessment = Field(..., description="Detailed symptom information")
    patient_info: PatientInfo = Field(..., description="Basic patient information")
    medical_history: Optional[MedicalHistory] = Field(None, description="Patient's medical history")
    additional_context: Optional[str] = Field(None, max_length=2000, description="Additional context or concerns")

    class Config:
        """Pydantic configuration."""
        use_enum_values = True


class OTCRecommendation(BaseModel):
    """Model for over-the-counter medication recommendations."""
    medicine: str = Field(..., description="Medication name (generic/brand)")
    dosage: str = Field(..., description="Recommended dosage")
    purpose: str = Field(..., description="Purpose of the medication")
    instructions: str = Field(..., description="How and when to take")
    precautions: str = Field(..., description="Important precautions and warnings")
    max_duration: str = Field(..., description="Maximum duration of use")
    alternatives: Optional[List[str]] = Field(None, description="Alternative options")


class DiagnosticPlan(BaseModel):
    """Model for diagnostic recommendations."""
    consultations: Optional[List[str]] = Field(None, description="Recommended specialist consultations")
    tests: Optional[List[str]] = Field(None, description="Recommended diagnostic tests")
    red_flags: Optional[List[str]] = Field(None, description="Red flag symptoms requiring immediate attention")
    follow_up: Optional[str] = Field(None, description="Follow-up recommendations")


class MedicalAssessment(BaseModel):
    """Model for medical assessment results."""
    chief_complaint: str = Field(..., description="Primary complaint summary")
    history_present_illness: str = Field(..., description="Detailed history of present illness")
    assessment: str = Field(..., description="Medical assessment and diagnosis")
    diagnostic_plan: DiagnosticPlan = Field(..., description="Diagnostic recommendations")
    otc_recommendations: List[OTCRecommendation] = Field(default_factory=list, description="OTC medication recommendations")
    lifestyle_recommendations: Optional[List[str]] = Field(None, description="Lifestyle and self-care recommendations")
    when_to_seek_help: Optional[str] = Field(None, description="When to seek immediate medical help")


class HealthReport(BaseModel):
    """Complete health report model."""
    id: str = Field(..., description="Unique report identifier")
    patient_info: PatientInfo = Field(..., description="Patient information")
    assessment_request: HealthAssessmentRequest = Field(..., description="Original assessment request")
    medical_assessment: MedicalAssessment = Field(..., description="AI-generated medical assessment")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation timestamp")
    report_version: str = Field(default="1.0", description="Report format version")
    ai_model_used: str = Field(..., description="AI model used for generation")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="AI confidence score")
    disclaimer: str = Field(
        default="This report is for informational purposes only and should not replace professional medical advice.",
        description="Medical disclaimer"
    )

    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ChatMessage(BaseModel):
    """Model for chat messages."""
    id: str = Field(..., description="Message unique identifier")
    role: str = Field(..., description="Message role (user/assistant)")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional message metadata")


class ChatSession(BaseModel):
    """Model for chat sessions."""
    id: str = Field(..., description="Session unique identifier")
    user_id: str = Field(..., description="User identifier")
    title: Optional[str] = Field(None, description="Session title")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Session last update timestamp")
    message_count: int = Field(default=0, description="Number of messages in session")
    is_active: bool = Field(default=True, description="Whether session is active")


class VoiceAnalysisRequest(BaseModel):
    """Request model for voice analysis."""
    audio_data: str = Field(..., description="Base64 encoded audio data")
    language: Optional[str] = Field(default="en", description="Language code")
    context: Optional[str] = Field(None, description="Context for analysis")


class VoiceAnalysisResponse(BaseModel):
    """Response model for voice analysis."""
    transcript: str = Field(..., description="Transcribed text")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Transcription confidence")
    detected_symptoms: Optional[List[str]] = Field(None, description="Symptoms detected in voice")
    emotional_state: Optional[str] = Field(None, description="Detected emotional state")
    recommendations: Optional[List[str]] = Field(None, description="Voice analysis recommendations")


class ImageAnalysisRequest(BaseModel):
    """Request model for image analysis."""
    image_data: str = Field(..., description="Base64 encoded image data")
    image_type: str = Field(..., description="Image MIME type")
    analysis_type: str = Field(default="symptom", description="Type of analysis requested")


class ImageAnalysisResponse(BaseModel):
    """Response model for image analysis."""
    detected_conditions: List[str] = Field(default_factory=list, description="Detected medical conditions")
    confidence_scores: Dict[str, float] = Field(default_factory=dict, description="Confidence scores for detections")
    recommendations: List[str] = Field(default_factory=list, description="Analysis recommendations")
    requires_attention: bool = Field(default=False, description="Whether immediate medical attention is needed")