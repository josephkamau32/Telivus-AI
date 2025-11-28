"""
Main API router for Telivus AI Backend v1.

Combines all API endpoints into a single router.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health, chat, reports, voice, image, trajectory, alerts

# Create main API router
api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["health"]
)

api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["chat"]
)

api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["reports"]
)

api_router.include_router(
    voice.router,
    prefix="/voice",
    tags=["voice"]
)

api_router.include_router(
    image.router,
    prefix="/image",
    tags=["image"]
)

api_router.include_router(
    trajectory.router,
    prefix="/trajectory",
    tags=["trajectory"]
)

api_router.include_router(
    alerts.router,
    prefix="/alerts",
    tags=["alerts"]
)

api_router.include_router(
    trajectory.router,
    prefix="/trajectory",
    tags=["trajectory"]
)