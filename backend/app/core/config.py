"""
Core configuration for Telivus AI Backend.

Uses Pydantic settings for environment variable management and validation.
"""

from typing import List, Optional, Union
from pydantic import AnyHttpUrl, field_validator, ValidationInfo
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings with environment variable support.
    """

    # API Configuration
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Server Configuration
    SERVER_NAME: str = "Telivus AI Backend"
    SERVER_HOST: AnyHttpUrl = "http://localhost"
    DEBUG: bool = True

    # CORS Configuration
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:8000",  # FastAPI server
        "https://telivus.co.ke",  # Production frontend
        "https://telivus-ai-git-main-joseph-kamaus-projects-ff2f6da1.vercel.app",  # Current Vercel deployment
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(
        cls, v: Union[str, List[str]]
    ) -> Union[List[str], str]:
        """Parse CORS origins from environment variable."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Trusted Hosts
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "telivus.co.ke"]

    # Database Configuration
    DATABASE_URL: str = "postgresql://user:password@localhost/telivus_ai"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_CACHE_TTL: int = 3600  # 1 hour

    # OpenAI Configuration
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_TEMPERATURE: float = 0.1
    OPENAI_MAX_TOKENS: int = 2000

    # Vector Database Configuration
    VECTOR_DB_TYPE: str = "chroma"  # "chroma" or "pinecone"
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = ""
    PINECONE_INDEX_NAME: str = "telivus-medical-knowledge"

    # Supabase Configuration (for migration compatibility)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""

    # Payment Configuration
    PAYMENT_PROVIDER: str = "flutterwave"  # or "stripe"
    FLUTTERWAVE_SECRET_KEY: str = ""
    FLUTTERWAVE_PUBLIC_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Email Configuration
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # Feature Flags
    ENABLE_AI_AGENTS: bool = True
    ENABLE_RAG: bool = True
    ENABLE_VOICE_ANALYSIS: bool = True
    ENABLE_IMAGE_ANALYSIS: bool = True

    # Medical Knowledge Base
    MEDICAL_KB_CHUNK_SIZE: int = 1000
    MEDICAL_KB_CHUNK_OVERLAP: int = 200
    MEDICAL_KB_TOP_K: int = 5

    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create global settings instance
settings = Settings()