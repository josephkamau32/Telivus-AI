"""
Simple FastAPI server for testing basic functionality.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI application
app = FastAPI(
    title="Telivus AI Backend - Simple Test",
    description="Basic FastAPI server for testing",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
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

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )