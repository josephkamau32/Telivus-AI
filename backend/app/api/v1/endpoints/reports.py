"""
Medical reports endpoints.

Provides endpoints for retrieving and managing health reports.
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/reports")
async def get_reports():
    """Get user's health reports."""
    return {"message": "Reports endpoint - Coming soon"}

@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    """Get specific health report."""
    return {"message": f"Report {report_id} - Coming soon"}