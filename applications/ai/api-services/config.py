import os

# MongoDB connection — override via env in production
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB", "citypulse_ai")

# Shared secret between the upstream service and this inference API.
# The upstream sends it in every request as a Bearer token.
API_TOKEN = os.getenv("AI_API_TOKEN", "change-me-in-production")

# Root folder for all model weights.
# Each task has its own key pointing to a subfolder/filename under MODEL_DIR.
MODEL_DIR = os.getenv("MODEL_DIR", os.path.join(os.path.dirname(__file__), "weights"))

# Task-specific model paths, relative to MODEL_DIR.
OCCUPANCY_MODEL = os.getenv("OCCUPANCY_MODEL", "mobilenetv2/phase1_weights.pth")

# Server bind settings — 0.0.0.0 makes it reachable inside Docker
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8001))
