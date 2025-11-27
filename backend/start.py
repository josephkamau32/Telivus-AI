#!/usr/bin/env python3
"""
Production startup script for Telivus AI Backend.

This script ensures proper initialization and error handling for production deployment.
"""

import os
import sys
import logging
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def check_environment():
    """Check if required environment variables are set."""
    required_vars = []
    optional_vars = ["OPENAI_API_KEY", "DATABASE_URL", "REDIS_URL"]

    missing_required = []
    for var in required_vars:
        if not os.getenv(var):
            missing_required.append(var)

    if missing_required:
        print(f"ERROR: Missing required environment variables: {', '.join(missing_required)}")
        sys.exit(1)

    # Log optional variables status
    for var in optional_vars:
        status = "✓ Set" if os.getenv(var) else "✗ Not set"
        print(f"{var}: {status}")

def setup_logging():
    """Setup basic logging before importing the main app."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    logger.info("Starting Telivus AI Backend...")

def main():
    """Main startup function."""
    print("🚀 Telivus AI Backend - Production Startup")
    print("=" * 50)

    # Check environment
    print("📋 Checking environment variables...")
    check_environment()
    print()

    # Setup logging
    setup_logging()

    try:
        # Import and run the FastAPI app
        from app.main import app
        import uvicorn

        print("✅ Application loaded successfully")
        print("🌐 Starting server on 0.0.0.0:8000")
        print()

        # Run with production settings
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=int(os.getenv("PORT", 8000)),
            reload=False,  # Disable reload in production
            log_level="info",
            access_log=True,
            server_header=False,  # Don't expose server info
            date_header=False
        )

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed:")
        print("pip install -r requirements.txt")
        sys.exit(1)

    except Exception as e:
        print(f"❌ Startup error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()