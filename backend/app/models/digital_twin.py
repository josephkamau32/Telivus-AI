"""
Digital Twin Database Models

Models for storing and managing personalized AI health avatars that learn
continuously from user interactions.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class DigitalTwin(Base):
    """
    Digital Twin model - Core persistent AI health avatar.
    
    Represents a continuous learning AI model of a user's health that
    improves with every interaction.
    """
    __tablename__ = "digital_twins"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False, unique=True)

    # Twin profile
    twin_name = Column(String(100), default="My Health Twin")
    avatar_type = Column(String(50), default="default")  # default, premium, custom
    
    # Learning state
    learning_level = Column(String(50), default="beginner")  # beginner, intermediate, advanced, expert
    data_points_count = Column(Integer, default=0)
    interaction_count = Column(Integer, default=0)
    
    # Performance metrics
    accuracy_score = Column(Float, default=0.0)  # 0-100
    prediction_accuracy = Column(Float, default=0.0)  # 0-100
    confidence_level = Column(Float, default=0.0)  # 0-100
    
    # Twin capabilities
    capabilities = Column(JSON, default={})  # Features unlocked based on data
    
    # Settings and preferences
    settings = Column(JSON, default={
        "alert_frequency": "moderate",
        "prediction_sensitivity": "medium",
        "learning_rate": "normal",
        "privacy_mode": "balanced"
    })
    
    # Extra data
    extra_data = Column(JSON, default={})
    last_learning_update = Column(DateTime(timezone=True))
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    health_events = relationship("HealthEvent", back_populates="digital_twin", cascade="all, delete-orphan")
    learned_patterns = relationship("LearnedPattern", back_populates="digital_twin", cascade="all, delete-orphan")
    proactive_alerts = relationship("ProactiveAlert", back_populates="digital_twin", cascade="all, delete-orphan")
    twin_insights = relationship("TwinInsight", back_populates="digital_twin", cascade="all, delete-orphan")


class HealthEvent(Base):
    """
    Health events tracked over time for the digital twin's learning.
    
    Stores every health-related interaction, assessment, or data point
    to build the twin's longitudinal health narrative.
    """
    __tablename__ = "health_events"

    id = Column(String, primary_key=True, index=True)
    twin_id = Column(String, ForeignKey("digital_twins.id"), index=True, nullable=False)
    
    # Event details
    event_type = Column(String(50), nullable=False)  # assessment, symptom, vital_sign, intervention, outcome
    event_category = Column(String(50))  # cardio, respiratory, mental_health, etc.
    
    event_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Event data
    symptoms = Column(JSON)  # Symptom data
    vital_signs = Column(JSON)  # Vital sign measurements
    interventions = Column(JSON)  # Treatments or interventions applied
    outcomes = Column(JSON)  # Results or outcomes
    
    # Context
    severity = Column(Integer)  # 0-10 severity scale
    feeling_state = Column(String(50))  # good, tired, unwell, etc.
    
    # Quality metrics
    data_quality = Column(Float, default=1.0)  # 0-1 data reliability score
    verified = Column(Boolean, default=False)
    
    # Extra data
    extra_data = Column(JSON, default={})
    source = Column(String(50), default="user_input")  # user_input, wearable, assessment, healthcare_provider
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    digital_twin = relationship("DigitalTwin", back_populates="health_events")


class LearnedPattern(Base):
    """
    Patterns discovered by the digital twin through causal inference.
    
    Represents cause-effect relationships the twin has learned about
    the user's unique health patterns.
    """
    __tablename__ = "learned_patterns"

    id = Column(String, primary_key=True, index=True)
    twin_id = Column(String, ForeignKey("digital_twins.id"), index=True, nullable=False)
    
    # Pattern identification
    pattern_type = Column(String(50), nullable=False)  # causal, correlation, trend, seasonal
    category = Column(String(50))  # symptom, lifestyle, environmental
    
    # Cause and effect
    cause = Column(String(200), nullable=False)  # e.g., "Coffee after 2pm"
    effect = Column(String(200), nullable=False)  # e.g., "Poor sleep quality"
    
    # Statistical confidence
    confidence_score = Column(Float, nullable=False)  # 0-100
    evidence_count = Column(Integer, default=1)  # Number of occurrences
    statistical_significance = Column(Float)  # p-value or similar metric
    
    # Impact assessment
    effect_strength = Column(Float)  # How strong the relationship is
    effect_direction = Column(String(20))  # positive, negative, neutral
    
    # Temporal information
    time_lag = Column(String(50))  # e.g., "2 hours", "next day"
    seasonality = Column(String(50))  # If there's a seasonal component
    
    # Status
    is_validated = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)  # Can be false if pattern no longer holds
    
    # Extra data
    extra_data = Column(JSON, default={})
    supporting_data = Column(JSON)  # Data points that support this pattern
    
    # Timestamps
    discovered_at = Column(DateTime(timezone=True), server_default=func.now())
    last_confirmed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    digital_twin = relationship("DigitalTwin", back_populates="learned_patterns")


class ProactiveAlert(Base):
    """
    AI-generated proactive health alerts from the digital twin.
    
    Alerts generated before symptoms worsen based on predicted patterns
    and risk assessments.
    """
    __tablename__ = "proactive_alerts"

    id = Column(String, primary_key=True, index=True)
    twin_id = Column(String, ForeignKey("digital_twins.id"), index=True, nullable=False)
    
    # Alert classification
    alert_type = Column(String(50), nullable=False)  # prediction, risk_warning, pattern_detected, recommendation
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    category = Column(String(50))  # symptom, vital_sign, lifestyle, environmental
    
    # Alert content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Prediction details
    predicted_condition = Column(String(200))
    predicted_likelihood = Column(Float)  # 0-100 probability
    predicted_timeframe = Column(String(50))  # e.g., "next 3 weeks"
    confidence_score = Column(Float, nullable=False)  # 0-100
    
    # Reasoning
    reasoning = Column(JSON)  # Explanation of why this alert was generated
    contributing_factors = Column(JSON)  # List of factors that led to this alert
    similar_cases_count = Column(Integer)  # Number of similar patterns in other users
    
    # Recommendations
    recommended_actions = Column(JSON)  # List of recommended actions
    intervention_suggestions = Column(JSON)  # Specific interventions to try
    
    # Status tracking
    status = Column(String(20), default="active")  # active, acknowledged, dismissed, resolved
    acknowledged_at = Column(DateTime(timezone=True))
    dismissed_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    
    user_feedback = Column(String(20))  # helpful, not_helpful, false_positive
    feedback_notes = Column(Text)
    
    # Alert effectiveness
    was_accurate = Column(Boolean)  # Did the prediction come true?
    user_took_action = Column(Boolean)
    outcome = Column(JSON)  # What happened after the alert
    
    # Extra data
    extra_data = Column(JSON, default={})
    
    # Timestamps
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    digital_twin = relationship("DigitalTwin", back_populates="proactive_alerts")


class TwinInsight(Base):
    """
    Key insights and learnings the digital twin has discovered about the user.
    
    High-level summaries of what the twin knows about the user's health patterns.
    """
    __tablename__ = "twin_insights"

    id = Column(String, primary_key=True, index=True)
    twin_id = Column(String, ForeignKey("digital_twins.id"), index=True, nullable=False)
    
    # Insight details
    insight_type = Column(String(50), nullable=False)  # health_pattern, risk_factor, protective_factor, lifestyle_impact
    category = Column(String(50))  # symptom, diet, exercise, sleep, stress, etc.
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Evidence
    confidence_level = Column(Float, nullable=False)  # 0-100
    evidence_strength = Column(String(20))  # weak, moderate, strong
    data_points_used = Column(Integer, default=0)
    
    # Impact
    health_impact = Column(String(20))  # positive, negative, neutral
    impact_score = Column(Float)  # Magnitude of impact
    
    # Actionability
    is_actionable = Column(Boolean, default=False)
    suggested_actions = Column(JSON)  # What user can do about this
    
    # Visibility
    is_highlighted = Column(Boolean, default=False)  # Show prominently to user
    priority = Column(Integer, default=5)  # 1-10, higher = more important
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Extra data
    extra_data = Column(JSON, default={})
    
    # Timestamps
    discovered_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    digital_twin = relationship("DigitalTwin", back_populates="twin_insights")


class TwinLearningLog(Base):
    """
    Audit log of the digital twin's learning process.
    
    Tracks every time the twin learns something new or updates its models.
    """
    __tablename__ = "twin_learning_logs"

    id = Column(String, primary_key=True, index=True)
    twin_id = Column(String, ForeignKey("digital_twins.id"), index=True, nullable=False)
    
    # Learning event
    learning_type = Column(String(50), nullable=False)  # pattern_discovered, model_updated, accuracy_improved
    description = Column(Text)
    
    # Before/after metrics
    metrics_before = Column(JSON)
    metrics_after = Column(JSON)
    improvement_delta = Column(Float)
    
    # Data used
    data_points_processed = Column(Integer)
    events_analyzed = Column(Integer)
    
    # Results
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    
    # Processing
    processing_time_ms = Column(Integer)
    
    # Extra data
    extra_data = Column(JSON, default={})
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
