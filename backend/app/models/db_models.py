"""
SQLAlchemy database models for Telivus AI Backend.

These models define the database schema for storing health reports,
chat sessions, user data, and other application data.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

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