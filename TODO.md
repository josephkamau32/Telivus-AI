# Remaining Technical Debt

## ✅ Completed
- [x] **Dependency conflict resolved**: `langfuse<2.0` (→ 1.14.0) avoids `anyio>=4.4.0` conflict with `fastapi==0.104.1`
- [x] **Ruff lint**: All 50 substantive errors fixed (B904 ×36, E402 ×6, B025 ×1, F401 ×1, C901 ×4, plus 2 E402 noqa suppressions for intentional late imports)
- [x] **prometheus-fastapi-instrumentator==6.1.0** pinned (compatible with starlette 0.27.0)

## 🔲 Outstanding Items

### 1. Type Annotations (`ANN` rule family — 771 warnings)
These are **informational** and currently suppressed in `pyproject.toml` config. Adding full type annotations is a large follow-up effort.

**Recommended approach**: Enable `ANN` rules file-by-file, starting with public API surfaces:
```
backend/app/api/v1/endpoints/*.py  — API endpoints
backend/app/core/*.py              — Core infrastructure
backend/app/services/*.py          — Service layer
```

### 2. Optional `ragas` Dependency
`ragas` is **not** in `requirements.txt` and is only used in the evaluation script (`backend/scripts/evaluate_rag.py`). It's imported inside a `try/except ImportError` guard.

**To run RAG evaluation**:
```bash
pip install ragas datasets langchain-openai
python scripts/evaluate_rag.py
```

### 3. Optional `langfuse` Dependency
`langfuse<2.0` (resolves to 1.14.0) **is** in `requirements.txt`. The only import site (`backend/app/agents/base_agent.py:17-20`) is guarded:
```python
try:
    from langfuse.callback import CallbackHandler
except ImportError:
    CallbackHandler = None
```
If langfuse is not needed, it can safely be removed from `requirements.txt` — the app will function without it.

### 4. Docker CI Verification (Network-Blocked)
Full `pip install -r requirements.txt` in Docker (`python:3.11-slim`) succeeds up to the NVIDIA CUDA libraries pulled by `torch`. Network instability on the current connection prevents completion.

**Workaround options**:
1. **CPU-only torch** (in progress): `pip install torch --index-url https://download.pytorch.org/whl/cpu` before `requirements.txt`
2. **CI environment**: Run on GitHub Actions where PyPI connectivity is reliable
3. **Pin torch CPU variant**: Replace `torch==2.1.0` with `torch==2.1.0+cpu` and add `--extra-index-url https://download.pytorch.org/whl/cpu` to requirements

### 5. CI Workflow Commands (Step 6)
Once Docker install completes, verify these exact CI commands exit 0:
```bash
ruff check backend/                    # ✅ Already verified locally
pytest -v                              # Pending Docker completion
```
