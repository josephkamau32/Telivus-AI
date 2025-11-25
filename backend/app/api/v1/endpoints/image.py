"""
Image analysis endpoints.

Provides endpoints for image-based symptom analysis.
"""

from fastapi import APIRouter

router = APIRouter()

@router.post("/analyze")
async def analyze_image():
    """Analyze image for medical conditions."""
    return {"message": "Image analysis - Coming soon"}