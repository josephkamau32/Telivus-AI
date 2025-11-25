"""
Voice analysis endpoints.

Provides endpoints for voice-based symptom reporting and analysis.
"""

from fastapi import APIRouter

router = APIRouter()

@router.post("/analyze")
async def analyze_voice():
    """Analyze voice input for symptoms."""
    return {"message": "Voice analysis - Coming soon"}