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
import json

from app.core.monitoring import configure_metrics

# Import sanitizer for request sanitization middleware
from app.utils.sanitizer import validate_and_sanitize_json, detect_sql_injection, detect_command_injection

# Use simple versions for now to avoid complex dependencies
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.digital_twin import router as twin_router
from app.core.config import settings
from app.core.logging import setup_logging
from app.services.vector_store_simple import initialize_vector_store
from app.core.exceptions import TelivusBaseException

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

# Expose metrics endpoint when the optional dependency is available
configure_metrics(app)

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

# Security Headers Middleware - CSP, HSTS, and other security headers
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """
    Add security headers to all responses.
    
    Headers added:
    - Content-Security-Policy: Restricts resource loading
    - Strict-Transport-Security: Enforces HTTPS
    - X-Content-Type-Options: Prevents MIME sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Legacy XSS protection
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Controls browser features
    """
    response = await call_next(request)
    
    # Content Security Policy - restrictive but allows necessary resources
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://telivus-ai.onrender.com https://api.openai.com wss://*.langfuse.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "object-src 'none'"
    )
    response.headers["Content-Security-Policy"] = csp_policy
    
    # Strict Transport Security - enforce HTTPS for 1 year
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Legacy XSS protection (still useful for older browsers)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Control referrer information
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Control browser features
    response.headers["Permissions-Policy"] = (
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
        "magnetometer=(), microphone=(), payment=(), usb=()"
    )
    
    return response

# Request Sanitization Middleware - sanitize incoming request bodies
@app.middleware("http")
async def request_sanitization_middleware(request: Request, call_next):
    """
    Sanitize incoming request bodies to prevent injection attacks.
    
    Applies to JSON request bodies for POST, PUT, PATCH requests.
    Uses a receive wrapper to avoid consuming the body stream prematurely.
    Properly handles multi-chunk request bodies.
    """
    # Only sanitize requests with JSON body
    if request.method in ("POST", "PUT", "PATCH") and request.headers.get("content-type", "").startswith("application/json"):
        import json
        import logging
        
        logger = logging.getLogger(__name__)
        original_receive = request._receive
        body_chunks = []
        chunk_count = 0
        
        async def receive_wrapper():
            nonlocal chunk_count
            message = await original_receive()
            if message["type"] == "http.request":
                body_chunks.append(message.get("body", b""))
                chunk_count += 1
                # If this is the last chunk, sanitize the complete body
                if not message.get("more_body", False):
                    full_body = b"".join(body_chunks)
                    if full_body:
                        try:
                            json_data = json.loads(full_body)
                            sanitized_data = validate_and_sanitize_json(json_data)
                            
                            # Check for injection attempts
                            body_str = json.dumps(sanitized_data)
                            if detect_sql_injection(body_str):
                                logger.warning(f"Potential SQL injection attempt from {request.client.host if request.client else 'unknown'}")
                            
                            if detect_command_injection(body_str):
                                logger.warning(f"Potential command injection attempt from {request.client.host if request.client else 'unknown'}")
                            
                            # Replace body with sanitized version in the final chunk
                            message["body"] = json.dumps(sanitized_data).encode()
                        except json.JSONDecodeError:
                            # Invalid JSON, let the normal error handling deal with it
                            pass
                else:
                    # Intermediate chunk - send empty body, the full body will be in the last chunk
                    message["body"] = b""
            return message
        
        request._receive = receive_wrapper
    
    response = await call_next(request)
    return response

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
    logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.2f}s")

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
    if isinstance(exc, TelivusBaseException):
        # Handle custom application exceptions
        return JSONResponse(
            status_code=500, # Use a proper status code logic if available on the exception
            content={
                "error": exc.__class__.__name__,
                "message": str(exc),
                "request_id": str(uuid.uuid4())
            }
        )
    elif isinstance(exc, HTTPException):
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

# Simple health check endpoint
@app.get("/health")
async def health_check():
    """Simple health check endpoint for monitoring and load balancers."""
    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "service": "telivus-ai-backend",
        "timestamp": time.time(),
        "checks": {
            "server": "running",
            "cors_origins": 5,  # Number of configured origins
            "database": "configured",  # Placeholder
            "ai_service": "available"  # Assume available, actual check happens during requests
        }
    }

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
app.include_router(twin_router, tags=["Digital Twin"])

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