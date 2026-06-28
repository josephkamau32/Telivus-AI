"""
Pytest Configuration and Shared Fixtures

This module provides shared fixtures for testing including:
- Mock AI services
- Test clients
- Sample data
"""

import pytest
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
import os

# Set test environment before importing app
os.environ["TESTING"] = "1"
os.environ["DEBUG"] = "True"
os.environ["OPENAI_API_KEY"] = "test-key-not-real"

from app.main import app


@pytest.fixture
def test_client() -> Generator:
    """
    Create a test client for synchronous API testing.

    Usage:
        def test_endpoint(test_client):
            response = test_client.get("/health")
            assert response.status_code == 200
    """
    with TestClient(app) as client:
        yield client


@pytest.fixture
async def async_client() -> AsyncGenerator:
    """
    Create an async test client for async API testing.

    Usage:
        async def test_endpoint(async_client):
            response = await async_client.get("/health")
            assert response.status_code == 200
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# Mock AI Service Fixtures

class MockOpenAIResponse:
    """Mock OpenAI API response"""
    def __init__(self, content: str):
        self.choices = [type('obj', (object,), {
            'message': type('obj', (object,), {
                'content': content
            })()
        })()]


@pytest.fixture
def mock_openai_response():
    """Mock successful OpenAI API response"""
    return MockOpenAIResponse(
        '{"assessment": "Patient presents with headache and fever", '
        '"recommendations": ["Rest", "Hydration"], '
        '"confidence": 0.85}'
    )


@pytest.fixture
def mock_ai_assessment():
    """Mock health assessment AI response"""
    return {
        "id": "test_assessment_123",
        "patient_info": {
            "name": "Test Patient",
            "age": 30,
            "gender": "male",
        },
        "medical_assessment": {
            "chief_complaint": "Headache and fever",
            "history_present_illness": "Patient reports onset 2 days ago",
            "assessment": "Likely viral infection",
            "diagnostic_plan": {
                "recommended_tests": ["Complete Blood Count"],
                "red_flags": ["Severe headache", "High fever >103F"],
                "follow_up": "If symptoms persist beyond 5 days",
            },
            "otc_recommendations": [
                {
                    "medication": "Acetaminophen",
                    "dosage": "500mg every 6 hours",
                    "purpose": "Fever and pain relief",
                }
            ],
            "lifestyle_recommendations": [
                "Get adequate rest",
                "Stay hydrated",
                "Monitor temperature",
            ],
            "when_to_seek_help": "Seek immediate care if fever exceeds 103F",
        },
        "confidence_score": 0.85,
        "generated_at": "2025-12-29T11:00:00Z",
        "ai_model_used": "gpt-4o-mini",
    }


# Sample Data Fixtures

@pytest.fixture
def sample_patient_data():
    """Sample patient information for testing"""
    return {
        "name": "John Doe",
        "age": 30,
        "gender": "male",
        "email": "john.doe@example.com",
    }


@pytest.fixture
def sample_symptoms():
    """Sample symptoms for testing"""
    return {
        "symptoms": ["headache", "fever", "fatigue"],
        "severity": {
            "headache": 7,
            "fever": 8,
            "fatigue": 6,
        },
        "duration": {
            "headache": "2 days",
            "fever": "2 days",
            "fatigue": "3 days",
        },
    }


@pytest.fixture
def sample_medical_history():
    """Sample medical history for testing"""
    return {
        "past_medical_conditions": "Hypertension",
        "current_medications": "Lisinopril 10mg daily",
        "allergies": "Penicillin",
        "family_history": "Diabetes (father)",
        "social_history": "Non-smoker, occasional alcohol",
    }


@pytest.fixture
def sample_health_assessment_request():
    """Complete health assessment request for testing"""
    return {
        "feeling": "unwell",
        "symptom_assessment": {
            "symptoms": ["headache", "fever"],
            "severity": {"headache": 7, "fever": 8},
            "duration": {"headache": "2 days", "fever": "2 days"},
        },
        "patient_info": {
            "name": "John Doe",
            "age": 30,
            "gender": "male",
        },
        "medical_history": {
            "past_medical_conditions": ["None"],
            "current_medications": ["None"],
            "allergies": ["None"],
        },
    }


# Vector Store Fixtures

@pytest.fixture
def mock_vector_search_results():
    """Mock vector similarity search results"""
    return [
        {
            "content": "Headache can be caused by various factors including dehydration, stress, or infection.",
            "metadata": {"topic": "headache", "confidence": 0.92},
        },
        {
            "content": "Fever is often a sign of infection and should be monitored closely.",
            "metadata": {"topic": "fever", "confidence": 0.89},
        },
    ]


# Environment Fixtures

@pytest.fixture(autouse=True)
def test_environment(monkeypatch):
    """Set up test environment variables"""
    monkeypatch.setenv("TESTING", "1")
    monkeypatch.setenv("DEBUG", "True")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-123")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./test.db")
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/1")
    yield
