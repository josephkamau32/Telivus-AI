# Troubleshooting & FAQ

## Common Issues

### OpenAI API Rate Limits
**Problem**: `RateLimitError: You exceeded your current quota` or `429 Too Many Requests`

**Solutions**:
- Check your OpenAI dashboard for usage limits and billing status
- Set `OPENAI_API_KEY` in `.env` with a valid key that has available quota
- Implement exponential backoff in your client (the backend includes retry logic)
- Consider using a different model (e.g., `gpt-3.5-turbo` instead of `gpt-4o-mini`)

### Database Connection Errors
**Problem**: `asyncpg.exceptions.CannotConnectNowError` or `connection refused`

**Solutions**:
- Ensure PostgreSQL is running: `docker-compose up -d postgres`
- Verify `DATABASE_URL` in `.env` matches your PostgreSQL instance
- Check firewall/network rules if using external database (Render, Supabase, etc.)
- Run migrations: `cd backend && alembic upgrade head`

### Redis Connection Issues
**Problem**: `redis.exceptions.ConnectionError: Error 111 connecting to localhost:6379`

**Solutions**:
- Start Redis: `docker-compose up -d redis`
- Verify `REDIS_URL` in `.env` (default: `redis://localhost:6379/0`)
- For Render deployment, use the Redis URL from your Render dashboard

### CORS Errors in Frontend
**Problem**: `Access to fetch at 'https://telivus-ai.onrender.com' from origin 'https://telivus.co.ke' has been blocked by CORS policy`

**Solutions**:
- Add your frontend URL to `CORS_ORIGINS` in backend `.env`
- For local development: `CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`
- For production: `CORS_ORIGINS=https://telivus.co.ke,https://www.telivus.co.ke`
- Restart backend after changing CORS settings

### ChromaDB Persistence Issues
**Problem**: Vector store data lost on container restart or `chromadb.errors.InvalidCollectionException`

**Solutions**:
- Ensure `CHROMA_PERSIST_DIRECTORY` is set to a mounted volume in `docker-compose.yml`
- Default: `./data/chroma` (mounted as volume in docker-compose)
- Run `docker-compose down -v` to reset if corrupted, then re-populate: `cd backend && python scripts/populate_knowledge_base.py`

### Frontend Build Failures
**Problem**: `npm run build` fails with TypeScript errors or missing dependencies

**Solutions**:
- Run `npm ci` to ensure clean install
- Check Node.js version matches `.nvmrc` or `package.json` engines field (Node 18+)
- Clear Vite cache: `rm -rf node_modules/.vite && npm run build`

### Backend Tests Failing
**Problem**: `pytest` fails with import errors or database connection issues

**Solutions**:
- Run tests from backend directory: `cd backend && pytest`
- Ensure test database is configured: `TEST_DATABASE_URL` in `.env.test`
- Run with coverage gate: `pytest --cov=app --cov-fail-under=70`

### Docker Build Failures
**Problem**: `docker-compose build` fails with pip install errors or missing dependencies

**Solutions**:
- Ensure `requirements.txt` and `pyproject.toml` are in sync
- Clear Docker cache: `docker-compose build --no-cache`
- Check Python version in `Dockerfile` matches `runtime.txt` (Python 3.11)

### Render Free-Tier Cold Starts
**Problem**: Backend takes 30-60 seconds to respond on first request

**Explanation**: Render's free tier spins down services after 15 minutes of inactivity. The first request triggers a cold start.

**Solutions**:
- Use [UptimeRobot](https://uptimerobot.com/) (free plan) to ping `/health` every 14 minutes
- The frontend now shows a friendly "Waking up backend server…" spinner instead of an error
- Consider upgrading to Render's Starter plan ($7/mo) for always-on instances

---

## Frequently Asked Questions

**Q: Can I use this for real medical diagnosis?**
A: **No.** This is a research prototype and engineering portfolio. It is not FDA-approved, CE-marked, or medically certified. Always consult licensed healthcare providers.

**Q: How do I add my own medical knowledge to the RAG system?**
A: Add JSON files to `backend/app/data/` following the schema in `medical_knowledge.json`, then run `python scripts/populate_knowledge_base.py`.

**Q: Can I use a different LLM provider (Anthropic, local models, etc.)?**
A: Yes. The LangChain agents use `ChatOpenAI` by default. Swap the LLM in `backend/app/agents/base_agent.py` or agent initialization to use `ChatAnthropic`, `ChatOllama`, etc.

**Q: How do I enable Langfuse tracing?**
A: Set `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_HOST` in `.env`. Traces appear automatically in your Langfuse dashboard.

**Q: How do I run the frontend and backend locally without Docker?**
A:
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your keys
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd ..
npm install
npm run dev
```

**Q: How do I deploy to Render + Vercel?**
A: See [deployment.md](deployment.md) for step-by-step instructions.

**Q: Where are the API docs?**
A: Local: `http://localhost:8000/docs` | Production: `https://telivus-ai.onrender.com/docs`

**Q: How do I run the health trajectory prediction?**
A: Use the `/api/v1/trajectory/predict` endpoint with a patient's historical health data. See `backend/app/services/trajectory_prediction.py` for the model interface.
