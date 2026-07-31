import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

# Load local .env when present, keep env vars working too.
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
else:
    load_dotenv()

# MongoDB connection — override via env in production
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB", "citypulse_ai")

# Shared secret between the upstream service and this inference API.
# The upstream sends it in every request as a Bearer token.
API_TOKEN = os.getenv("AI_API_TOKEN", "change-me-in-production")

# Root folder for all model weights.
# Each task has its own key pointing to a subfolder/filename under MODEL_DIR.
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(__file__), "weights"))

# Model paths, relative to MODEL_DIR, loaded from the env file.
DEFAULT_OCCUPANCY_MODEL = "mobilenetv2/phase2_weights.pth"


def _load_model_paths() -> dict[str, str]:
    occupancy_path = os.getenv("MODEL_PATH_OCCUPANCY", "").strip() or DEFAULT_OCCUPANCY_MODEL
    vps_net_path = os.getenv("MODEL_PATH_VPS_NET", "").strip()

    return {
        "occupancy": occupancy_path,
        "slot-occupancy": vps_net_path or occupancy_path,
    }


MODEL_PATHS = _load_model_paths()
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "occupancy")

# Server bind settings — 0.0.0.0 makes it reachable inside Docker
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8001))
