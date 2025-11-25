#!/usr/bin/env python3
"""
Simple test script to verify basic functionality without complex dependencies.
"""

import asyncio
import os
import json
import uuid
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create a simple FastAPI app for testing
app = FastAPI(
    title="Telivus AI Backend - Simple Test",
    description="Basic FastAPI server for testing",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "telivus-ai-backend-simple"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Telivus AI Backend - Simple Test",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health"
    }

# Test health endpoint
@app.get("/api/v1/health/test")
async def test_health_endpoint():
    """Test health assessment endpoint."""
    return {
        "message": "Health assessment endpoint - Coming soon",
        "status": "placeholder"
    }

# AI-powered health assessment endpoint
@app.post("/api/v1/health/assess")
async def assess_health(request: dict):
    """AI-powered health assessment endpoint."""
    try:
        # Get OpenAI API key from environment
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            print("No OpenAI API key found, using mock response")
            return await mock_assess_health(request)

        # Import OpenAI here to avoid import errors if not installed
        try:
            import openai
        except ImportError:
            print("OpenAI package not installed, using mock response")
            return await mock_assess_health(request)

        # Configure OpenAI
        openai.api_key = openai_api_key

        # Extract patient data
        feeling = request.get("feeling", "not specified")
        symptoms = request.get("symptom_assessment", {}).get("symptoms", [])
        patient_info = request.get("patient_info", {})
        medical_history = request.get("medical_history", {})

        age = patient_info.get("age", 25)
        name = patient_info.get("name", "Anonymous")
        gender = patient_info.get("gender", "not specified")

        # Build medical context
        medical_context = f"""
        PATIENT INFORMATION:
        - Name: {name}
        - Age: {age} years
        - Gender: {gender}
        - Current Feeling: {feeling}
        - Symptoms: {', '.join(symptoms) if symptoms else 'None reported'}
        """

        if medical_history:
            if medical_history.get("past_medical_conditions"):
                medical_context += f"\n- Past Medical History: {medical_history['past_medical_conditions']}"
            if medical_history.get("current_medications"):
                medical_context += f"\n- Current Medications: {medical_history['current_medications']}"
            if medical_history.get("allergies"):
                medical_context += f"\n- Allergies: {medical_history['allergies']}"

        # Create AI prompt
        prompt = f"""{medical_context}

        As a medical AI assistant, provide a comprehensive health assessment in the following JSON format:

        {{
          "chief_complaint": "Primary symptom or concern (1-2 sentences)",
          "history_present_illness": "Detailed history of current symptoms and context (2-3 sentences)",
          "assessment": "Medical assessment with likely diagnosis and differentials (3-4 sentences)",
          "diagnostic_plan": {{
            "consultations": ["Recommended specialist consultations"],
            "tests": ["Recommended diagnostic tests"],
            "red_flags": ["Symptoms requiring immediate attention"],
            "follow_up": "Follow-up recommendations"
          }},
          "otc_recommendations": [
            {{
              "medicine": "Medication name (generic/brand)",
              "dosage": "Age-appropriate dosage instructions",
              "purpose": "What the medication treats",
              "instructions": "How and when to take",
              "precautions": "Important warnings and contraindications",
              "max_duration": "Maximum duration of use"
            }}
          ],
          "lifestyle_recommendations": ["Lifestyle and self-care recommendations"],
          "when_to_seek_help": "When to contact healthcare provider immediately"
        }}

        IMPORTANT:
        - Base recommendations on reported symptoms only
        - Include appropriate red flags for serious conditions
        - Provide evidence-based OTC recommendations
        - Always emphasize consulting healthcare professionals
        - Keep responses professional and medically accurate
        """

        # Call OpenAI API
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an experienced medical AI assistant providing preliminary health assessments. Always emphasize that this is not a substitute for professional medical care."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=1500,
            temperature=0.1,  # Low temperature for medical accuracy
            response_format={"type": "json_object"}
        )

        # Parse AI response
        ai_response = response.choices[0].message.content
        assessment_data = json.loads(ai_response) if ai_response else {}

        # Build final response
        report = {
            "id": f"ai_report_{uuid.uuid4().hex[:8]}",
            "patient_info": {
                "name": name,
                "age": age,
                "gender": gender
            },
            "medical_assessment": assessment_data,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "ai_model_used": "gpt-4o-mini",
            "confidence_score": 0.85,  # Estimated confidence
            "disclaimer": "This AI-generated assessment is for informational purposes only and should not replace professional medical advice. Always consult a licensed healthcare provider for diagnosis and treatment."
        }

        print(f"Generated AI health report for {name} with symptoms: {symptoms}")
        return report

    except Exception as e:
        print(f"AI assessment failed: {e}")
        # Fallback to mock response
        return await mock_assess_health(request)


# Mock health assessment endpoint (fallback)
async def mock_assess_health(request: dict):
    """Mock health assessment endpoint."""
    return {
        "id": "mock_report_123",
        "patient_info": {
            "name": request.get("patient_info", {}).get("name", "Anonymous"),
            "age": request.get("patient_info", {}).get("age", 25),
            "gender": request.get("patient_info", {}).get("gender", "not specified")
        },
        "medical_assessment": {
            "chief_complaint": "General health concerns",
            "history_present_illness": "Patient reports various symptoms requiring evaluation.",
            "assessment": "Multiple symptoms reported. Comprehensive evaluation recommended.",
            "diagnostic_plan": {
                "consultations": ["Primary care physician evaluation recommended"],
                "tests": ["Basic metabolic panel", "Complete blood count"],
                "red_flags": ["Severe pain", "Unexplained weight loss"],
                "follow_up": "Schedule appointment with healthcare provider"
            },
            "otc_recommendations": [
                {
                    "medicine": "Acetaminophen (Tylenol)",
                    "dosage": "500-1000mg every 4-6 hours as needed",
                    "purpose": "Reduce fever and relieve pain",
                    "instructions": "Take with food. Do not exceed 3000mg per day.",
                    "precautions": "Avoid if you have liver disease.",
                    "max_duration": "5-7 days"
                }
            ],
            "lifestyle_recommendations": [
                "Maintain healthy diet and regular exercise",
                "Ensure adequate sleep and stress management"
            ],
            "when_to_seek_help": "Contact healthcare provider if symptoms worsen."
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "ai_model_used": "mock_assessment_service",
        "confidence_score": 0.8,
        "disclaimer": "This is a mock assessment for demonstration purposes. Always consult healthcare professionals for actual medical advice."
    }

if __name__ == "__main__":
    import uvicorn

    print("Starting simple Telivus AI Backend test server...")
    print("API will be available at: http://127.0.0.1:8000")
    print("Health check: http://127.0.0.1:8000/health")
    print("API docs: http://127.0.0.1:8000/docs")

    uvicorn.run(
        "test_simple:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )