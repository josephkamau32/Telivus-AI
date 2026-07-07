import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def test_metrics_setup_handles_missing_instrumentator():
    from app.core import monitoring
    from fastapi import FastAPI

    app = FastAPI()
    monitoring.configure_metrics(app)

    # Should not raise even if instrumentator is not installed
    assert app is not None
