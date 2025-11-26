"""
Telivus AI Backend - Advanced Health Assessment Platform

A comprehensive AI-powered health assessment system featuring:
- LangChain-powered AI agents for intelligent health consultations
- RAG (Retrieval-Augmented Generation) with medical knowledge base
- Multi-agent orchestration for complex health scenarios
- Real-time symptom analysis and personalized recommendations
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import logging
import time

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

# Set up CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add trusted host middleware
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing information."""
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

    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions globally."""
    logger = logging.getLogger(__name__)
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later."
        }
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "telivus-ai-backend"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to Telivus AI Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# Include API routers
app.include_router(health_router, prefix=f"{settings.API_V1_STR}/health", tags=["health"])

# Add explicit OPTIONS handling for CORS preflight requests
@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight OPTIONS requests."""
    return {"message": "OK"}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )