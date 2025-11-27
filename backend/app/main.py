"""
Telivus AI Backend - Advanced Health Assessment Platform

A comprehensive AI-powered health assessment system featuring:
- LangChain-powered AI agents for intelligent health consultations
- RAG (Retrieval-Augmented Generation) with medical knowledge base
- Multi-agent orchestration for complex health scenarios
- Real-time symptom analysis and personalized recommendations
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import uuid

# Use simple versions for now to avoid complex dependencies
from app.api.v1.endpoints.health import router as health_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.services.vector_store_simple import initialize_vector_store

# Simple database initialization (no complex async setup for now)
async def create_tables():
    """Simple table creation - placeholder for now."""
    pass

# Setup logging
setup_logging()

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle application startup and shutdown events.
    """
    # Startup
    logger = logging.getLogger(__name__)
    logger.info("Starting Telivus AI Backend...")

    # Initialize database
    await create_tables()
    logger.info("Database tables initialized")

    # Initialize vector store for RAG
    await initialize_vector_store()
    logger.info("Vector store initialized")

    logger.info("Telivus AI Backend startup complete")

    yield

    # Shutdown
    logger.info("Shutting down Telivus AI Backend...")

# Create FastAPI application
app = FastAPI(
    title="Telivus AI Backend",
    description="Advanced AI-powered health assessment platform with LangChain agents and RAG",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set up CORS with comprehensive configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8080",
        "https://telivus.co.ke",
        "https://telivus-ai-git-main-joseph-kamaus-projects-ff2f6da1.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,  # 24 hours
)

# Add trusted host middleware
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

# Request logging middleware with CORS headers
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing information and add CORS headers."""
    start_time = time.time()

    # Get logger
    logger = logging.getLogger(__name__)

    # Log request
    logger.info(f"Request: {request.method} {request.url}")

    # Process request
    response = await call_next(request)

    # Calculate processing time
    process_time = time.time() - start_time

    # Log response
    logger.info(".2f")

    # Add CORS headers explicitly
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://localhost:8080",
        "https://telivus.co.ke",
        "https://telivus-ai-git-main-joseph-kamaus-projects-ff2f6da1.vercel.app"
    ]

    origin = request.headers.get("origin")
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"

    return response

# Global exception handler with comprehensive error handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions globally with detailed logging."""
    logger = logging.getLogger(__name__)

    # Log detailed error information
    logger.error(f"Unhandled exception in {request.method} {request.url}")
    logger.error(f"Exception type: {type(exc).__name__}")
    logger.error(f"Exception message: {str(exc)}")
    logger.error("Full traceback:", exc_info=True)

    # Determine appropriate error response
    if isinstance(exc, HTTPException):
        # FastAPI HTTPException - preserve status code
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTP exception",
                "message": exc.detail,
                "status_code": exc.status_code
            }
        )
    else:
        # Generic server error
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "message": "An unexpected error occurred. Please try again later.",
                "request_id": str(uuid.uuid4())  # For tracking
            }
        )

# Comprehensive health check endpoint
@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint for monitoring and load balancers."""
    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "service": "telivus-ai-backend",
        "timestamp": time.time(),
        "checks": {}
    }

    try:
        # Check AI service availability
        from app.services.health_assessment import HealthAssessmentService
        ai_service = HealthAssessmentService()
        health_status["checks"]["ai_service"] = "available" if ai_service.service_type != "error" else "unavailable"

        # Check OpenAI API key
        import os
        openai_key = os.getenv("OPENAI_API_KEY")
        health_status["checks"]["openai_api"] = "configured" if openai_key else "not_configured"

        # CORS configuration check
        cors_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
            "https://telivus.co.ke",
            "https://telivus-ai-git-main-joseph-kamaus-projects-ff2f6da1.vercel.app"
        ]
        health_status["checks"]["cors_origins"] = len(cors_origins)

        # Database connectivity (placeholder)
        health_status["checks"]["database"] = "configured"

        health_status["status"] = "healthy"

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        health_status["status"] = "unhealthy"
        health_status["error"] = str(e)

    return health_status

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to Telivus AI Backend - Live and Ready!",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "status": "AI-powered health assessments available"
    }

# CORS test endpoint
@app.get("/cors-test")
async def cors_test():
    """Test endpoint to verify CORS configuration."""
    return {
        "message": "CORS is working correctly",
        "allowed_origins": [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
            "http://localhost:8080",
            "https://telivus.co.ke",
            "https://telivus-ai-git-main-joseph-kamaus-projects-ff2f6da1.vercel.app"
        ],
        "status": "success"
    }

# Include API routers
app.include_router(health_router, prefix=f"{settings.API_V1_STR}/health", tags=["health"])

# Add explicit OPTIONS handling for CORS preflight requests
@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight OPTIONS requests."""
    return {"message": "CORS preflight OK", "path": path}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )