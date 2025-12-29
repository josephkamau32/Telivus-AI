# 🚀 Telivus AI - Quick Setup Guide

## Step 1: Install Backend Dependencies ⏳ IN PROGRESS

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**New packages being installed:**
- Testing: pytest, pytest-cov, pytest-asyncio, pytest-mock
- Caching: redis
- Security: python-jose, passlib, bleach
- Monitoring: sentry-sdk, structlog
- Code Quality: black, isort, flake8, mypy, pre-commit
- Database: psycopg2-binary, sqlalchemy, alembic

**This may take 5-10 minutes** depending on your internet connection.

---

## Step 2: Set Up Pre-commit Hooks

```powershell
# Install pre-commit
pip install pre-commit

# Install git hooks (from project root)
pre-commit install

# Test hooks (optional)
pre-commit run --all-files
```

---

## Step 3: Configure Environment Variables

Create `.env` file in backend directory:

```bash
# AI Configuration
OPENAI_API_KEY=your-openai-key-here

# Database (optional for local dev)
DATABASE_URL=postgresql://user:password@localhost/telivus_ai

# Redis (optional for local dev)
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn-here

# Environment
DEBUG=True
ENVIRONMENT=development
```

---

## Step 4: Run Tests

```powershell
# From backend directory (with venv activated)
pytest -v --cov=app

# Expected output:
# ✅ 48+ tests passing
# ✅ >80% coverage
```

---

## Step 5: Start Services

### Option A: Local Development (Simple)

```powershell
# Terminal 1: Backend
cd backend
.\venv\Scripts\Activate.ps1
python test_simple.py

# Terminal 2: Frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:8080
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option B: Docker Compose (Full Stack)

```powershell
# Set environment variables in .env first

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

**Access:**
- Frontend: http://localhost:8080
- Backend: http://localhost:8000
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090

---

## Verification Checklist

After setup, verify everything works:

### ✅ Dependencies Installed
```powershell
pip list | findstr pytest
pip list | findstr redis
pip list | findstr jose
```

### ✅ Pre-commit Hooks Active
```powershell
pre-commit --version
git config --get core.hooksPath
```

### ✅ Tests Pass
```powershell
pytest --version
pytest -v
```

### ✅ Backend Starts
```powershell
curl http://localhost:8000/health
# Should return: {"status": "healthy", ...}
```

### ✅ Frontend Builds
```powershell
npm run build
# Should complete without errors
```

---

## Troubleshooting

### Issue: pip install fails
**Solution:**
```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install packages one by one if needed
pip install pytest pytest-cov
pip install redis
# etc.
```

### Issue: Pre-commit hooks not running
**Solution:**
```powershell
# Reinstall hooks
pre-commit uninstall
pre-commit install
```

### Issue: Tests fail with import errors
**Solution:**
```powershell
# Ensure venv is activated
.\venv\Scripts\Activate.ps1

# Reinstall in editable mode
pip install -e .
```

### Issue: Redis connection errors
**Solution:**
1. Install Redis for Windows: https://github.com/microsoftarchive/redis/releases
2. Or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`
3. Or disable caching temporarily in code

---

## Next Steps After Setup

1. **Run the test suite** to ensure everything works
2. **Try the caching** - make same requests twice, see speed improvement
3. **Test rate limiting** - make 20+ rapid requests, see rate limit
4. **Test authentication** - use JWT tokens to access protected endpoints
5. **View metrics** - Check Grafana dashboards (if using docker-compose)
6. **Deploy to production** - Use the Dockerfile for deployment

---

## Quick Command Reference

```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Run tests
pytest -v --cov=app

# Format code
black app/ tests/
isort app/ tests/

# Lint code
flake8 app/ tests/

# Type check
mypy app/

# Start backend
python test_simple.py

# Start frontend
npm run dev

# Docker commands
docker-compose up -d
docker-compose down
docker-compose logs -f
```

---

**Need Help?** Check the comprehensive walkthrough in the artifacts directory!
