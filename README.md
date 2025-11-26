# Telivus AI - Advanced AI-Powered Health Assessment Platform

[![Live Demo](https://img.shields.io/badge/Frontend-Live-green)](https://telivus.co.ke/) [![Backend API](https://img.shields.io/badge/Backend-API-blue)](https://telivus-ai.onrender.com) [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org) [![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com) [![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org) [![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-orange.svg)](https://openai.com)

## 🌐 **Live Deployments**

- **🎨 Frontend (React + Vercel)**: [https://telivus.co.ke/](https://telivus.co.ke/)
- **⚡ Backend API (FastAPI + Render)**: [https://telivus-ai.onrender.com](https://telivus-ai.onrender.com)
- **📚 API Documentation**: [https://telivus-ai.onrender.com/docs](https://telivus-ai.onrender.com/docs)
- **🏥 Health Check**: [https://telivus-ai.onrender.com/health](https://telivus-ai.onrender.com/health)

Telivus AI is a **cutting-edge AI-powered health assessment platform** that combines advanced machine learning with modern web technologies to provide **personalized medical insights**. This project demonstrates expertise in full-stack development, AI/ML integration, and production-ready system architecture.

## 🚀 **What Makes This Special**

### **🤖 Advanced AI Architecture**
- **LangChain Multi-Agent System**: Specialized AI agents for health assessment, consultation, and emergency detection
- **RAG (Retrieval-Augmented Generation)**: Vector database with 20+ medical knowledge topics
- **GPT-4o-mini Integration**: Optimized AI responses with medical accuracy validation
- **Intelligent Fallbacks**: Seamless degradation when AI services are unavailable

### **🏗️ Enterprise-Grade Backend**
- **FastAPI + Python**: High-performance async API with automatic OpenAPI documentation
- **PostgreSQL + SQLAlchemy**: Robust database design with connection pooling
- **Redis Caching**: Performance optimization for repeated queries
- **Comprehensive Validation**: Pydantic models with detailed error handling

### **⚛️ Modern React Frontend**
- **TypeScript + Shadcn/ui**: Type-safe, accessible component library
- **Progressive Web App**: Installable on mobile devices with offline support
- **Voice Input Integration**: Hands-free symptom reporting
- **Multi-language Support**: Internationalization ready

## 🎯 **Key Features**

### **AI-Powered Health Assessment**
- **Intelligent Symptom Analysis**: Context-aware evaluation of user symptoms
- **Personalized Medical Reports**: Structured assessments with diagnostic plans
- **Emergency Detection**: Red flag identification for immediate medical attention
- **Evidence-Based Recommendations**: OTC medications and lifestyle advice

### **User Experience Excellence**
- **Progressive Web App**: Native app-like experience on any device
- **Voice-Activated Input**: Speech-to-text symptom reporting
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Accessibility First**: WCAG compliant with screen reader support
- **Offline Capability**: Core functionality works without internet

### **Production-Ready Architecture**
- **Scalable Backend**: Async processing with connection pooling
- **Security First**: JWT authentication and data encryption
- **Comprehensive Testing**: Unit and integration test coverage
- **Monitoring & Logging**: Structured logging with performance metrics
- **Docker Ready**: Containerized deployment with docker-compose

## 🛠️ **Technology Stack**

### **Frontend**
```typescript
React 18 + TypeScript + Vite
Shadcn/ui + Radix UI + Tailwind CSS
React Query + Context API
React Hook Form + Zod
Service Workers + PWA Manifest
```

### **Backend**
```python
FastAPI + Python 3.9+
LangChain + OpenAI GPT-4o-mini
PostgreSQL + SQLAlchemy ORM
Redis + ChromaDB (Vector Store)
Pydantic + JWT Authentication
```

### **AI/ML**
```python
LangChain Agents & Chains
OpenAI GPT-4o-mini
Sentence Transformers
ChromaDB / Pinecone
RAG Implementation
```

## 📊 **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React PWA     │    │   FastAPI        │    │   AI Agents     │
│   Frontend      │◄──►│   Backend        │◄──►│   (LangChain)   │
│                 │    │                  │    │                 │
│ - Voice Input   │    │ - Health API     │    │ - Assessment    │
│ - Symptom Flow  │    │ - AI Integration │    │ - Consultation  │
│ - Report Display│    │ - Vector Search  │    │ - Emergency     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                        │                        │
       └────────────────────────┴────────────────────────┘
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   ChromaDB      │
│   (Data)        │    │   (Cache)       │    │   (Vectors)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Technical Achievements**
- ✅ **Full-Stack AI Application**: React + Python + PostgreSQL + AI
- ✅ **Advanced AI Integration**: LangChain agents, RAG, GPT-4o-mini
- ✅ **Production Architecture**: Scalable, secure, monitored
- ✅ **Medical Domain Expertise**: Healthcare application with safety considerations
- ✅ **Modern Development**: TypeScript, async Python, containerization

### **AI Engineering Highlights**
- 🤖 **Multi-Agent System**: Specialized agents for different healthcare tasks
- 🧠 **RAG Implementation**: Vector database with medical knowledge retrieval
- 🎯 **Prompt Engineering**: Structured medical assessment prompts
- 🔄 **Fallback Systems**: Graceful degradation when AI unavailable
- 📊 **Performance Optimization**: Caching, async processing, rate limiting

### **Engineering Best Practices**
- 🧪 **Comprehensive Testing**: Unit, integration, and API testing
- 📚 **Documentation**: OpenAPI specs, architecture docs, deployment guides
- 🔒 **Security First**: Input validation, authentication, data protection
- 🚀 **DevOps Ready**: Docker, environment management, monitoring
- 📈 **Scalable Design**: Stateless architecture, horizontal scaling

## 📦 Installation & Setup

### Prerequisites

- **Node.js** (v18 or higher) and npm
- **Python** (3.9+) and pip
- **PostgreSQL** (13+) - optional for full features
- **Redis** - optional for caching
- **OpenAI API key** - for AI features

### Quick Start (5 minutes)

1. **Clone and setup frontend**
    ```bash
    git clone https://github.com/your-username/telivus-ai.git
    cd telivus-ai
    npm install
    npm run dev  # Frontend runs on http://localhost:8080
    ```

2. **Setup Python backend**
    ```bash
    cd backend
    python -m venv venv
    # Windows: venv\Scripts\activate
    source venv/bin/activate
    pip install -r requirements.txt
    python test_simple.py  # Backend runs on http://localhost:8000
    ```

3. **Environment Configuration**
    ```bash
    # Backend .env file
    cp .env.example .env
    # Add your OpenAI API key for AI features
    echo "OPENAI_API_KEY=your-key-here" >> .env
    ```

### Full Development Setup

#### Frontend Setup
```bash
npm install
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
```

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Database setup (optional)
createdb telivus_ai

# Run backend
python test_simple.py    # Simple test server
uvicorn app.main:app --reload  # Full server
```

#### Environment Variables
```bash
# .env file
DEBUG=True
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=postgresql://user:password@localhost/telivus_ai
REDIS_URL=redis://localhost:6379
VECTOR_DB_TYPE=chroma
```

## 🚀 Usage

### **🌐 Live Application (No Setup Required)**

**Visit the live application now:**
- **Frontend**: [https://telivus.co.ke/](https://telivus.co.ke/)
- **Try the AI Health Assessment** - Real GPT-4o-mini responses!

### **💻 Local Development**

1. **Start the servers**:
   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend
   cd backend && source venv/bin/activate && python test_simple.py
   ```

2. **Access locally**:
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:8000
   - **API Docs**: http://localhost:8000/docs

### **Full User Experience**

1. **Health Assessment Flow**:
   - Select your current feeling (good, unwell, tired, anxious, stressed)
   - Choose symptoms from predefined options or add custom symptoms
   - Provide basic information (age, name, gender)
   - Share medical history (optional but recommended)

2. **AI-Powered Analysis**:
   - Backend processes symptoms through LangChain agents
   - RAG system retrieves relevant medical knowledge
   - GPT-4o-mini generates personalized assessment

3. **Comprehensive Report**:
   - Chief complaint and history of present illness
   - Medical assessment with differentials
   - Diagnostic plan with red flags
   - OTC medication recommendations
   - Lifestyle and self-care advice

### **🤖 AI Testing (Live Endpoints)**

**Test Real GPT-4o-mini Responses:**

```bash
# Live API Testing
curl -X POST https://telivus-ai.onrender.com/api/v1/health/assess \
  -H "Content-Type: application/json" \
  -d '{
    "feeling": "tired",
    "symptom_assessment": {
      "symptoms": ["headache", "fatigue"]
    },
    "patient_info": {
      "name": "John Doe",
      "age": 30,
      "gender": "male"
    }
  }'
```

**Local Development Testing:**
```bash
curl -X POST http://localhost:8000/api/v1/health/assess \
  -H "Content-Type: application/json" \
  -d '{"feeling": "tired", "symptom_assessment": {"symptoms": ["headache", "fatigue"]}, "patient_info": {"name": "John Doe", "age": 30, "gender": "male"}}'
```

## 📸 Screenshots

### Login Page
![Login Page](screenshots/login-page.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Symptom Assessment Flow
![Symptom Assessment Step 1](screenshots/step1.png)

### AI Health Chat
![AI Health Chat](screenshots/health-chat1.png)

### Medical Report
![Medical Report](screenshots/medical-report.png)

## 🏗️ Project Structure

```
telivus-ai/
├── public/                 # Static assets and PWA files
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── integrations/      # External service integrations
│   ├── lib/               # Utility functions and configurations
│   └── assets/            # Images and icons
├── supabase/
│   ├── functions/         # Edge functions
│   └── migrations/        # Database migrations
├── screenshots/           # Application screenshots
└── tests/                 # Test files
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint for code linting
- Write tests for new features
- Update documentation as needed
- Ensure responsive design across devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

For security concerns, please refer to our [Security Policy](SECURITY.md).

## 📞 Support

If you have any questions or need support:

- Open an issue on GitHub
- Check the documentation
- Contact the maintainers

## 🚀 **Deployment**

### **Docker Deployment**
```bash
# Build and run with docker-compose
docker-compose up -d

# Or manual Docker build
docker build -t telivus-ai backend/
docker run -p 8000:8000 telivus-ai
```

### **Production Checklist**
- [ ] Set `DEBUG=False` in environment
- [ ] Configure production database
- [ ] Set up Redis caching
- [ ] Add OpenAI API key
- [ ] Configure domain and SSL
- [ ] Set up monitoring and logging
- [ ] Enable rate limiting
- [ ] Test all endpoints

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Guidelines**
- Follow TypeScript/Python best practices
- Add tests for new features
- Update documentation
- Ensure medical accuracy and safety
- Maintain security standards

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚕️ **Medical Disclaimer**

**IMPORTANT**: This AI-powered health assessment system is designed for **educational and demonstration purposes only**. It should **NOT** be used as a substitute for professional medical advice, diagnosis, or treatment.

- Always consult licensed healthcare providers for medical concerns
- AI assessments may contain inaccuracies
- Emergency symptoms require immediate medical attention
- This tool is not FDA approved or medically certified

## 🙏 **Acknowledgments**

- **AI Framework**: [LangChain](https://langchain.com) for agent orchestration
- **LLM Provider**: [OpenAI](https://openai.com) for GPT-4o-mini
- **Vector Database**: [ChromaDB](https://chroma-db.com) for RAG implementation
- **UI Framework**: [Shadcn/ui](https://ui.shadcn.com) for beautiful components
- **Backend Framework**: [FastAPI](https://fastapi.tiangolo.com) for high-performance APIs
- **Icons**: [Lucide React](https://lucide.dev) for consistent iconography

## 📞 **Support**

- **Issues**: [GitHub Issues](https://github.com/your-username/telivus-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/telivus-ai/discussions)
- **Documentation**: See [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) for technical details

---

**Built by Joseph Kamau with ❤️ for better healthcare accessibility through AI innovation**

*This project represents the cutting edge of AI engineering applied to healthcare technology.*
