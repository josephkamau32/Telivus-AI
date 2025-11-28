"""
SQLAlchemy database models for Telivus AI Backend.

These models define the database schema for storing health reports,
chat sessions, user data, and other application data.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, JSON, ForeignKey, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TIMESTAMP

Base = declarative_base()


class User(Base):
    """User model for authentication and profile data."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    health_reports = relationship("HealthReport", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")


class HealthReport(Base):
    """Health report model for storing AI-generated assessments."""
    __tablename__ = "health_reports"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)

    # Patient information
    age = Column(Integer, nullable=False)
    feeling = Column(String, nullable=False)
    symptoms = Column(JSON, nullable=False)  # Array of symptoms

    # Assessment data
    status = Column(String, default="processing")  # processing, completed, failed
    report_data = Column(JSON)  # Complete assessment results
    otc_recommendations = Column(JSON)  # OTC medication suggestions

    # Metadata
    ai_model_used = Column(String)
    confidence_score = Column(Float)
    processing_time_ms = Column(Integer)

    # Error handling
    error_message = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="health_reports")
    logs = relationship("ReportLog", back_populates="health_report")


class ReportLog(Base):
    """Audit log for health report processing."""
    __tablename__ = "report_logs"

    id = Column(Integer, primary_key=True, index=True)
    health_report_id = Column(String, ForeignKey("health_reports.id"), index=True)

    event_type = Column(String, nullable=False)  # request_started, request_completed, request_failed
    payload = Column(JSON)  # Event-specific data
    user_id = Column(String, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    health_report = relationship("HealthReport", back_populates="logs")


class ChatSession(Base):
    """Chat session model for AI conversations."""
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)

    title = Column(String, default="Health Consultation")
    is_active = Column(Boolean, default=True)
    message_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session")


class ChatMessage(Base):
    """Individual chat message model."""
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), index=True)

    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    metadata = Column(JSON)  # Additional message data

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="messages")


class ChatSubscription(Base):
    """Chat subscription model for payment/billing."""
    __tablename__ = "chat_subscriptions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)

    subscription_type = Column(String, nullable=False)  # pay_per_chat, unlimited
    status = Column(String, default="active")  # active, expired, pending

    chats_remaining = Column(Integer)  # For pay_per_chat subscriptions
    amount = Column(Float, nullable=False)  # Subscription/payment amount

    payment_reference = Column(String)  # Payment gateway reference

    expires_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ReportCache(Base):
    """Cache for health report generation to improve performance."""
    __tablename__ = "report_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String, unique=True, index=True, nullable=False)

    report_data = Column(JSON, nullable=False)
    hit_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)


class VectorDocument(Base):
    """Store vectorized documents for RAG system."""
    __tablename__ = "vector_documents"

    id = Column(String, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    metadata = Column(JSON)
    embedding = Column(JSON)  # Store embedding vector

    source = Column(String)  # medical_guidelines, research, etc.
    category = Column(String)  # symptoms, conditions, treatments, etc.

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class HealthDataPoint(Base):
    """Time-series health data points for trajectory analysis."""
    __tablename__ = "health_data_points"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    # Health metrics
    symptom_severity = Column(JSON)  # Symptom name -> severity score (0-10)
    vital_signs = Column(JSON)  # heart_rate, blood_pressure, temperature, etc.
    lab_values = Column(JSON)  # blood_work, biomarkers, etc.
    lifestyle_factors = Column(JSON)  # sleep_hours, exercise_minutes, stress_level, etc.

    # Context
    assessment_id = Column(String, ForeignKey("health_reports.id"), index=True)
    data_source = Column(String, nullable=False)  # user_input, wearable, lab_results, assessment

    # Quality and validation
    confidence_score = Column(Float, default=1.0)  # Data quality confidence
    is_validated = Column(Boolean, default=False)

    # Timestamps
    recorded_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="health_data_points")
    assessment = relationship("HealthReport", backref="data_points")


class HealthTrajectory(Base):
    """Predicted health trajectories and risk assessments."""
    __tablename__ = "health_trajectories"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    # Trajectory metadata
    trajectory_type = Column(String, nullable=False)  # symptom_progression, condition_risk, vital_trends
    condition_name = Column(String)  # Specific condition being tracked
    prediction_horizon_days = Column(Integer, nullable=False)  # How far into future

    # Prediction data
    baseline_data = Column(JSON)  # Starting point health metrics
    predicted_trajectory = Column(JSON)  # Time-series predictions with confidence intervals
    risk_assessments = Column(JSON)  # Risk scores for various conditions

    # Model information
    model_version = Column(String, nullable=False)
    model_confidence = Column(Float, default=0.0)
    feature_importance = Column(JSON)  # Which factors influenced the prediction

    # Status and validation
    status = Column(String, default="active")  # active, archived, invalidated
    is_baseline_updated = Column(Boolean, default=False)

    # Timestamps
    baseline_date = Column(DateTime(timezone=True), nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))  # When to recalculate

    # Relationships
    user = relationship("User", backref="health_trajectories")
    interventions = relationship("Intervention", back_populates="trajectory")


class Intervention(Base):
    """Health interventions and their outcomes."""
    __tablename__ = "interventions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    trajectory_id = Column(String, ForeignKey("health_trajectories.id"), index=True)

    # Intervention details
    intervention_type = Column(String, nullable=False)  # medication, lifestyle, therapy, monitoring
    intervention_name = Column(String, nullable=False)  # Specific intervention
    description = Column(Text)

    # Implementation
    prescribed_by = Column(String)  # AI, healthcare_provider, user
    dosage_instructions = Column(JSON)  # For medications/supplements
    schedule = Column(JSON)  # When/how often to perform

    # Status tracking
    status = Column(String, default="planned")  # planned, active, completed, discontinued
    adherence_score = Column(Float, default=0.0)  # 0-1 adherence rate
    effectiveness_score = Column(Float)  # User/provider rated effectiveness

    # Outcomes
    outcome_metrics = Column(JSON)  # Health metrics before/after
    side_effects = Column(JSON)  # Any reported side effects
    notes = Column(Text)

    # Timestamps
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="interventions")
    trajectory = relationship("HealthTrajectory", back_populates="interventions")


class TrajectorySimulation(Base):
    """Simulation results for different intervention scenarios."""
    __tablename__ = "trajectory_simulations"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    trajectory_id = Column(String, ForeignKey("health_trajectories.id"), index=True)

    # Simulation parameters
    scenario_name = Column(String, nullable=False)
    intervention_changes = Column(JSON)  # What interventions are modified
    assumption_parameters = Column(JSON)  # Model assumptions for this scenario

    # Results
    simulated_trajectory = Column(JSON)  # Predicted trajectory under this scenario
    risk_changes = Column(JSON)  # How risks change compared to baseline
    confidence_intervals = Column(JSON)  # Uncertainty bounds

    # Analysis
    probability_improvement = Column(Float)  # Likelihood of positive outcome
    expected_value = Column(Float)  # Expected health improvement score
    recommendation_strength = Column(Float)  # How strongly recommended (0-1)

    # Metadata
    simulation_model = Column(String, nullable=False)
    processing_time_ms = Column(Integer)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", backref="trajectory_simulations")
    trajectory = relationship("HealthTrajectory", backref="simulations")


class PredictiveAlert(Base):
    """Predictive health alerts for users."""
    __tablename__ = "predictive_alerts"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    trajectory_id = Column(String, ForeignKey("health_trajectories.id"), index=True)

    # Alert details
    alert_type = Column(String, nullable=False)  # symptom_worsening, vital_sign_abnormal, etc.
    severity = Column(String, default="medium")  # low, medium, high, critical
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    condition_name = Column(String)

    # Prediction data
    predicted_value = Column(Float)
    threshold_value = Column(Float)
    confidence_score = Column(Float, default=0.0)

    # Actions and data
    recommended_actions = Column(JSON)  # List of recommended actions
    data_points = Column(JSON)  # Supporting data for the alert

    # Status tracking
    status = Column(String, default="active")  # active, acknowledged, resolved, dismissed
    acknowledged_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="predictive_alerts")
    trajectory = relationship("HealthTrajectory", backref="alerts")


class AlertRule(Base):
    """Alert rule configurations for users."""
    __tablename__ = "alert_rules"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    # Rule configuration
    alert_type = Column(String, nullable=False)
    condition_name = Column(String)
    metric_name = Column(String, nullable=False)
    operator = Column(String, nullable=False)  # >, <, >=, <=, ==
    threshold_value = Column(Float, nullable=False)
    time_window_days = Column(Integer, default=7)
    severity = Column(String, default="medium")
    is_active = Column(Boolean, default=True)

    # Notification settings
    notification_channels = Column(JSON)  # ["email", "sms", "push", "in_app"]
    cooldown_hours = Column(Integer, default=24)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="alert_rules")


class AlertNotification(Base):
    """Alert notification delivery records."""
    __tablename__ = "alert_notifications"

    id = Column(String, primary_key=True, index=True)
    alert_id = Column(String, ForeignKey("predictive_alerts.id"), index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    # Notification details
    channel = Column(String, nullable=False)  # email, sms, push, in_app
    status = Column(String, default="pending")  # pending, sent, delivered, failed
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    error_message = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    alert = relationship("PredictiveAlert", backref="notifications")
    user = relationship("User", backref="alert_notifications")


class AlertAnalytics(Base):
    """Analytics and performance metrics for alert system."""
    __tablename__ = "alert_analytics"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    # Alert statistics
    total_alerts = Column(Integer, default=0)
    acknowledged_alerts = Column(Integer, default=0)
    resolved_alerts = Column(Integer, default=0)
    false_positives = Column(Integer, default=0)
    average_response_time_hours = Column(Float, default=0.0)
    alert_effectiveness_score = Column(Float, default=0.0)

    # Performance metrics
    true_positive_rate = Column(Float, default=0.0)
    false_positive_rate = Column(Float, default=0.0)
    precision_score = Column(Float, default=0.0)
    recall_score = Column(Float, default=0.0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="alert_analytics")


class APILog(Base):
    """API request/response logging for monitoring."""
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String, index=True)

    method = Column(String, nullable=False)
    path = Column(String, nullable=False)
    status_code = Column(Integer, nullable=False)

    user_id = Column(String, index=True)
    ip_address = Column(String)

    request_body = Column(JSON)
    response_body = Column(JSON)

    processing_time_ms = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())