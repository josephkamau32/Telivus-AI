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


class ReasoningNode(BaseModel):
    """Node in the differential diagnosis reasoning graph."""
    id: str = Field(..., description="Unique node identifier")
    type: str = Field(..., description="Node type (symptom, condition, factor, triage)")
    label: str = Field(..., description="Display label for the node")
    description: str = Field(..., description="Detailed description")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score for this node")
    evidence_sources: List[str] = Field(default_factory=list, description="Sources supporting this conclusion")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional node metadata")


class ReasoningEdge(BaseModel):
    """Edge connecting nodes in the reasoning graph."""
    source_id: str = Field(..., description="Source node ID")
    target_id: str = Field(..., description="Target node ID")
    relationship_type: str = Field(..., description="Type of relationship (causes, supports, rules_out, etc.)")
    strength: float = Field(..., ge=0.0, le=1.0, description="Strength of the relationship")
    explanation: str = Field(..., description="Explanation of the relationship")


class ReasoningGraph(BaseModel):
    """Complete differential diagnosis reasoning graph."""
    nodes: List[ReasoningNode] = Field(default_factory=list, description="All nodes in the graph")
    edges: List[ReasoningEdge] = Field(default_factory=list, description="All edges connecting nodes")
    root_symptoms: List[str] = Field(default_factory=list, description="Initial symptom node IDs")
    final_diagnosis: Optional[str] = Field(None, description="Final diagnosis node ID")
    triage_level: str = Field(..., description="Triage urgency level (routine, urgent, emergency)")
    reasoning_summary: str = Field(..., description="High-level summary of the reasoning process")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="When the graph was generated")


class MedicalAssessment(BaseModel):
    """Model for medical assessment results."""
    chief_complaint: str = Field(..., description="Primary complaint summary")
    history_present_illness: str = Field(..., description="Detailed history of present illness")
    assessment: str = Field(..., description="Medical assessment and diagnosis")
    diagnostic_plan: DiagnosticPlan = Field(..., description="Diagnostic recommendations")
    otc_recommendations: List[OTCRecommendation] = Field(default_factory=list, description="OTC medication recommendations")
    lifestyle_recommendations: Optional[List[str]] = Field(None, description="Lifestyle and self-care recommendations")
    when_to_seek_help: Optional[str] = Field(None, description="When to seek immediate medical help")
    reasoning_graph: Optional[ReasoningGraph] = Field(None, description="Explainable AI reasoning graph")


# CCEE (Clinical Confidence & Explainability Engine) Models

class ConfidenceBreakdown(BaseModel):
    """Detailed confidence score breakdown."""
    data_completeness: float = Field(..., ge=0.0, le=1.0, description="Data completeness score")
    symptom_signal_strength: float = Field(..., ge=0.0, le=1.0, description="Symptom signal strength")
    rag_relevance: float = Field(..., ge=0.0, le=1.0, description="RAG retrieval relevance")
    agent_agreement: float = Field(..., ge=0.0, le=1.0, description="Agent agreement score")
    model_consistency: float = Field(..., ge=0.0, le=1.0, description="Model consistency score")


class EvidenceItem(BaseModel):
    """Evidence mapping for a symptom."""
    symptom: str = Field(..., description="Symptom name")
    supporting_sources: List[str] = Field(..., description="Medical sources supporting this symptom assessment")
    confidence_contribution: float = Field(..., ge=0.0, le=1.0, description="How much this symptom contributed to confidence")


class UncertaintyFactor(BaseModel):
    """Factor contributing to uncertainty."""
    category: str = Field(..., description="Category: missing_data, vague_symptoms, conflicting_info")
    description: str = Field(..., description="Description of the uncertainty factor")
    impact: str = Field(..., description="Impact on confidence (e.g., 'Reduces confidence by 15%')")
    suggestion: str = Field(..., description="What data would help reduce this uncertainty")


class SafetyLevel(str, Enum):
    """Medical safety levels."""
    GREEN = "green"
    AMBER = "amber"
    RED = "red"


class SafetyResult(BaseModel):
    """Safety scoring result."""
    safety_level: SafetyLevel = Field(..., description="Safety level: green, amber, or red")
    safety_notes: str = Field(..., description="Safety assessment notes and recommendations")
    triggered_rules: List[str] = Field(..., description="Which safety rules triggered this level")
    requires_immediate_care: bool = Field(..., description="Whether immediate medical care is required")


class ConfidenceAndExplainability(BaseModel):
    """Complete CCEE (Clinical Confidence & Explainability Engine) response."""
    confidence_score: int = Field(..., ge=0, le=100, description="Overall confidence score (0-100)")
    confidence_level: str = Field(..., description="Confidence level: low, medium, or high")
    confidence_breakdown: ConfidenceBreakdown = Field(..., description="Detailed breakdown of confidence components")
    evidence: List[EvidenceItem] = Field(..., description="Evidence mapping showing symptom → source connections")
    explanation_summary: str = Field(..., description="Human-readable explanation of reasoning")
    uncertainty_factors: List[UncertaintyFactor] = Field(..., description="Factors contributing to uncertainty")
    suggested_data_improvements: List[str] = Field(..., description="Suggestions for improving confidence")
    safety: SafetyResult = Field(..., description="Safety scoring and guardrails")


class HealthReport(BaseModel):
    """Complete health report model."""
    id: str = Field(..., description="Unique report identifier")
    patient_info: PatientInfo = Field(..., description="Patient information")
    assessment_request: HealthAssessmentRequest = Field(..., description="Original assessment request")
    medical_assessment: MedicalAssessment = Field(..., description="AI-generated medical assessment")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Report generation timestamp")
    report_version: str = Field(default="1.0", description="Report format version")
    ai_model_used: str = Field(..., description="AI model used for generation")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="AI confidence score (DEPRECATED: use confidence_and_explainability)")
    confidence_and_explainability: Optional[ConfidenceAndExplainability] = Field(None, description="CCEE confidence, explainability, and safety data")
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


# Trajectory Prediction Models

class HealthDataPoint(BaseModel):
    """Time-series health data point."""
    symptom_severity: Optional[Dict[str, float]] = Field(None, description="Symptom name -> severity score (0-10)")
    vital_signs: Optional[Dict[str, float]] = Field(None, description="Vital signs (heart_rate, blood_pressure, temperature, etc.)")
    lab_values: Optional[Dict[str, float]] = Field(None, description="Laboratory values and biomarkers")
    lifestyle_factors: Optional[Dict[str, Any]] = Field(None, description="Lifestyle metrics (sleep, exercise, stress, etc.)")
    recorded_at: datetime = Field(..., description="When this data was recorded")
    data_source: str = Field(..., description="Source of the data (user_input, wearable, assessment, etc.)")
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0, description="Data quality confidence")


class TrajectoryPrediction(BaseModel):
    """Predicted health trajectory."""
    condition_name: str = Field(..., description="Condition being predicted")
    prediction_horizon_days: int = Field(..., description="Days into future being predicted")
    baseline_date: datetime = Field(..., description="Starting point for prediction")
    predicted_values: List[Dict[str, Any]] = Field(..., description="Time-series predictions with confidence intervals")
    risk_assessments: Dict[str, float] = Field(default_factory=dict, description="Risk scores for various conditions")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Overall prediction confidence")
    feature_importance: Dict[str, float] = Field(default_factory=dict, description="Factors influencing prediction")


class InterventionPlan(BaseModel):
    """Health intervention recommendation."""
    intervention_type: str = Field(..., description="Type of intervention (medication, lifestyle, therapy, etc.)")
    intervention_name: str = Field(..., description="Specific intervention name")
    description: str = Field(..., description="Detailed description")
    prescribed_by: str = Field(default="AI", description="Who prescribed this intervention")
    dosage_instructions: Optional[Dict[str, Any]] = Field(None, description="Dosage details for medications")
    schedule: Optional[Dict[str, Any]] = Field(None, description="Implementation schedule")
    expected_outcome: Optional[str] = Field(None, description="Expected health outcome")
    side_effects: Optional[List[str]] = Field(None, description="Potential side effects")
    monitoring_required: Optional[List[str]] = Field(None, description="What to monitor")


class SimulationScenario(BaseModel):
    """Intervention simulation scenario."""
    scenario_name: str = Field(..., description="Name of the simulation scenario")
    intervention_changes: Dict[str, Any] = Field(..., description="Changes to interventions")
    assumption_parameters: Dict[str, Any] = Field(default_factory=dict, description="Model assumptions")
    simulated_trajectory: List[Dict[str, Any]] = Field(..., description="Predicted trajectory under this scenario")
    risk_changes: Dict[str, float] = Field(default_factory=dict, description="Changes in risk scores")
    probability_improvement: float = Field(..., ge=0.0, le=1.0, description="Likelihood of positive outcome")
    expected_value: float = Field(..., description="Expected health improvement score")
    recommendation_strength: float = Field(..., ge=0.0, le=1.0, description="How strongly recommended")


class HealthTrajectoryResponse(BaseModel):
    """Complete health trajectory analysis response."""
    user_id: str = Field(..., description="User identifier")
    trajectory_id: str = Field(..., description="Trajectory identifier")
    baseline_assessment: HealthDataPoint = Field(..., description="Current health baseline")
    predictions: List[TrajectoryPrediction] = Field(..., description="Health trajectory predictions")
    recommended_interventions: List[InterventionPlan] = Field(..., description="Recommended interventions")
    simulation_scenarios: List[SimulationScenario] = Field(default_factory=list, description="Alternative intervention scenarios")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Analysis generation timestamp")
    model_version: str = Field(..., description="ML model version used")
    disclaimer: str = Field(
        default="Trajectory predictions are estimates based on available data and should not replace professional medical advice.",
        description="Medical disclaimer"
    )


class TrajectoryRequest(BaseModel):
    """Request model for trajectory analysis."""
    user_id: str = Field(..., description="User identifier")
    prediction_horizon_days: int = Field(default=30, ge=1, le=365, description="Days to predict into future")
    include_simulations: bool = Field(default=True, description="Whether to include intervention simulations")
    focus_conditions: Optional[List[str]] = Field(None, description="Specific conditions to focus on")


class InterventionTrackingRequest(BaseModel):
    """Request model for tracking intervention outcomes."""
    intervention_id: str = Field(..., description="Intervention identifier")
    adherence_score: float = Field(..., ge=0.0, le=1.0, description="Self-reported adherence (0-1)")
    outcome_metrics: Dict[str, Any] = Field(..., description="Health metrics after intervention")
    side_effects: Optional[List[str]] = Field(None, description="Reported side effects")
    effectiveness_rating: Optional[int] = Field(None, ge=1, le=5, description="Self-rated effectiveness (1-5)")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional notes")


# Predictive Alerts Models

class AlertType(str, Enum):
    """Types of predictive alerts."""
    SYMPTOM_WORSENING = "symptom_worsening"
    VITAL_SIGN_ABNORMAL = "vital_sign_abnormal"
    RISK_LEVEL_INCREASE = "risk_level_increase"
    INTERVENTION_REMINDER = "intervention_reminder"
    EMERGENCY_WARNING = "emergency_warning"
    PREVENTIVE_ACTION = "preventive_action"
    MEDICATION_ADHERENCE = "medication_adherence"
    APPOINTMENT_REMINDER = "appointment_reminder"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    """Alert status states."""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class PredictiveAlert(BaseModel):
    """Predictive health alert model."""
    alert_id: str = Field(..., description="Unique alert identifier")
    user_id: str = Field(..., description="User identifier")
    alert_type: AlertType = Field(..., description="Type of alert")
    severity: AlertSeverity = Field(..., description="Alert severity level")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Detailed alert message")
    condition_name: str = Field(..., description="Related health condition")
    predicted_value: Optional[float] = Field(None, description="Predicted metric value")
    threshold_value: Optional[float] = Field(None, description="Threshold that triggered alert")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Prediction confidence")
    recommended_actions: List[str] = Field(default_factory=list, description="Recommended actions")
    data_points: Dict[str, Any] = Field(default_factory=dict, description="Supporting data")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Alert creation time")
    expires_at: Optional[datetime] = Field(None, description="Alert expiration time")
    status: AlertStatus = Field(default=AlertStatus.ACTIVE, description="Current alert status")
    acknowledged_at: Optional[datetime] = Field(None, description="When alert was acknowledged")
    resolved_at: Optional[datetime] = Field(None, description="When alert was resolved")


class AlertRule(BaseModel):
    """Alert rule configuration."""
    rule_id: str = Field(..., description="Rule identifier")
    user_id: str = Field(..., description="User identifier")
    alert_type: AlertType = Field(..., description="Type of alert this rule generates")
    condition_name: Optional[str] = Field(None, description="Specific condition to monitor")
    metric_name: str = Field(..., description="Metric to monitor (symptom, vital, risk)")
    operator: str = Field(..., description="Comparison operator (>, <, >=, <=, ==)")
    threshold_value: float = Field(..., description="Threshold value for triggering")
    time_window_days: int = Field(default=7, description="Time window for evaluation")
    severity: AlertSeverity = Field(default=AlertSeverity.MEDIUM, description="Default severity")
    is_active: bool = Field(default=True, description="Whether rule is active")
    notification_channels: List[str] = Field(default_factory=lambda: ["in_app"], description="Notification methods")
    cooldown_hours: int = Field(default=24, description="Minimum hours between alerts")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Rule creation time")


class AlertNotification(BaseModel):
    """Alert notification record."""
    notification_id: str = Field(..., description="Notification identifier")
    alert_id: str = Field(..., description="Associated alert identifier")
    user_id: str = Field(..., description="User identifier")
    channel: str = Field(..., description="Notification channel (email, sms, push, in_app)")
    status: str = Field(default="pending", description="Delivery status")
    sent_at: Optional[datetime] = Field(None, description="When notification was sent")
    delivered_at: Optional[datetime] = Field(None, description="When notification was delivered")
    error_message: Optional[str] = Field(None, description="Delivery error message")


class AlertAnalytics(BaseModel):
    """Analytics for alert system performance."""
    user_id: str = Field(..., description="User identifier")
    total_alerts: int = Field(default=0, description="Total alerts generated")
    acknowledged_alerts: int = Field(default=0, description="Alerts acknowledged by user")
    resolved_alerts: int = Field(default=0, description="Alerts that led to resolution")
    false_positives: int = Field(default=0, description="Incorrectly triggered alerts")
    average_response_time_hours: float = Field(default=0.0, description="Average time to acknowledge")
    alert_effectiveness_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Overall alert system effectiveness")


class AlertRequest(BaseModel):
    """Request model for alert operations."""
    user_id: str = Field(..., description="User identifier")
    alert_types: Optional[List[AlertType]] = Field(None, description="Filter by alert types")
    severity_levels: Optional[List[AlertSeverity]] = Field(None, description="Filter by severity")
    status_filter: Optional[List[AlertStatus]] = Field(None, description="Filter by status")
    limit: int = Field(default=50, ge=1, le=200, description="Maximum alerts to return")
    include_expired: bool = Field(default=False, description="Include expired alerts")


class AlertRuleRequest(BaseModel):
    """Request model for alert rule operations."""
    user_id: str = Field(..., description="User identifier")
    rule: AlertRule = Field(..., description="Alert rule configuration")


class AlertAcknowledgeRequest(BaseModel):
    """Request model for acknowledging alerts."""
    alert_id: str = Field(..., description="Alert identifier")
    user_id: str = Field(..., description="User identifier")
    action_taken: Optional[str] = Field(None, description="Action taken in response")
    effectiveness_rating: Optional[int] = Field(None, ge=1, le=5, description="How helpful was the alert")