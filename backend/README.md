# Telivus AI Backend

Advanced AI-powered health assessment platform backend built with FastAPI, LangChain, and modern Python technologies.

## 🚀 Features

- **AI-Powered Health Assessments**: LangChain agents with GPT-4o-mini for intelligent medical analysis
- **RAG System**: Vector database integration for medical knowledge retrieval
- **RESTful API**: FastAPI with automatic OpenAPI documentation
- **Async Processing**: High-performance async operations
- **Comprehensive Validation**: Pydantic models with detailed error handling
- **Security First**: JWT authentication and data protection
- **Scalable Architecture**: Designed for production deployment

## 🛠️ Technology Stack

- **Framework**: FastAPI (ASGI) with async support
- **AI/ML**: LangChain, OpenAI GPT-4o-mini, ChromaDB
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Caching**: Redis for performance optimization
- **Validation**: Pydantic with comprehensive schemas
- **Documentation**: Auto-generated OpenAPI/Swagger docs

## 📋 Prerequisites

- Python 3.9+
- PostgreSQL 13+
- Redis (optional, for caching)
- OpenAI API key (for AI features)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file:

```bash
# Application
DEBUG=True
SECRET_KEY=your-super-secret-key-change-in-production

# Database
DATABASE_URL=postgresql://user:password@localhost/telivus_ai

# AI Services
OPENAI_API_KEY=your-openai-api-key
VECTOR_DB_TYPE=chroma

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Server
SERVER_HOST=http://localhost
API_V1_STR=/api/v1
```

### 3. Database Setup

```bash
# Install PostgreSQL and create database
createdb telivus_ai

# Run migrations (when implemented)
alembic upgrade head
```

### 4. Run the Application

```bash
# Development server
python test_simple.py

# Or with uvicorn
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Access the API

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **API Base**: http://localhost:8000/api/v1

## 📚 API Endpoints

### Health Assessment

```bash
# Generate health report
POST /api/v1/health/assess
Content-Type: application/json

{
  "feeling": "good",
  "symptom_assessment": {
    "symptoms": ["headache", "fatigue"]
  },
  "patient_info": {
    "name": "John Doe",
    "age": 30,
    "gender": "male"
  },
  "medical_history": {
    "current_medications": "None",
    "allergies": "Penicillin"
  }
}
```

### Response Format

```json
{
  "id": "ai_report_abc123",
  "patient_info": {
    "name": "John Doe",
    "age": 30,
    "gender": "male"
  },
  "medical_assessment": {
    "chief_complaint": "Headache with fatigue",
    "history_present_illness": "30-year-old male presents with headache and fatigue...",
    "assessment": "Most likely tension-type headache with fatigue...",
    "diagnostic_plan": {
      "consultations": ["Primary care physician"],
      "tests": ["None indicated"],
      "red_flags": ["Severe headache", "neurological symptoms"],
      "follow_up": "Return if symptoms worsen"
    },
    "otc_recommendations": [
      {
        "medicine": "Acetaminophen (Tylenol)",
        "dosage": "500-1000mg every 4-6 hours",
        "purpose": "Pain relief",
        "instructions": "Take with food",
        "precautions": "Avoid if liver disease",
        "max_duration": "3 days"
      }
    ],
    "lifestyle_recommendations": [
      "Adequate sleep",
      "Stress management",
      "Regular exercise"
    ],
    "when_to_seek_help": "Seek immediate care for severe symptoms"
  },
  "generated_at": "2024-01-15T10:30:00Z",
  "ai_model_used": "gpt-4o-mini",
  "confidence_score": 0.85,
  "disclaimer": "AI-generated assessment for informational purposes only..."
}
```

## 🤖 AI Architecture

### Multi-Agent System

The backend implements a sophisticated multi-agent architecture:

1. **Health Assessment Agent**: Analyzes symptoms and generates medical reports
2. **Consultation Agent**: Handles follow-up questions and personalized advice
3. **Emergency Detection Agent**: Identifies red flags requiring immediate attention

### RAG (Retrieval-Augmented Generation)

- **Vector Database**: ChromaDB for medical knowledge storage
- **Embeddings**: Sentence transformers for semantic search
- **Knowledge Base**: 20+ medical topics with structured information
- **Context Enhancement**: Relevant medical knowledge injected into prompts

## 🧪 Testing

### Run Tests

```bash
# Unit tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

### API Testing

```bash
# Health check
curl http://localhost:8000/health

# Test assessment endpoint
curl -X POST http://localhost:8000/api/v1/health/assess \
  -H "Content-Type: application/json" \
  -d '{"feeling":"good","symptom_assessment":{"symptoms":["headache"]},"patient_info":{"age":30}}'
```

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db/telivus_ai
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: telivus_ai
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine
```

### Environment Variables for Production

```bash
DEBUG=False
SECRET_KEY=your-production-secret-key
DATABASE_URL=postgresql://user:password@prod-db/telivus_ai
REDIS_URL=redis://prod-redis:6379
OPENAI_API_KEY=your-production-openai-key
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com
```

## 🔒 Security

- **API Key Management**: Secure OpenAI API key handling
- **Input Validation**: Comprehensive Pydantic validation
- **Rate Limiting**: Prevents API abuse
- **CORS Configuration**: Proper cross-origin handling
- **Error Handling**: No sensitive information in error responses

## 📊 Monitoring

### Health Checks

- **Application Health**: `/health` endpoint
- **Database Connectivity**: Automatic connection validation
- **AI Service Status**: OpenAI API availability checks

### Logging

- **Structured Logging**: JSON format for production
- **Log Levels**: Configurable logging levels
- **Performance Monitoring**: Request timing and metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Medical Disclaimer

This AI-powered health assessment system is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment. Always consult with licensed healthcare providers for medical concerns.

---

**Built with ❤️ for better healthcare accessibility**