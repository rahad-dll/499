import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import PLATE_PRELOAD
from db.mongodb import connect_db, close_db
from predictor import load_plate_models
from routes.inference import router as inference_router
from routes.plates import router as plates_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # connect on startup, disconnect on shutdown
    await connect_db()
    if PLATE_PRELOAD:
        try:
            load_plate_models()
        except Exception as exc:
            logger.warning("Plate models not loaded: %s", exc)
    yield
    await close_db()


app = FastAPI(
    title="CityPulse Inference API",
    description="Parking occupancy and licence plate inference service",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inference_router)
app.include_router(plates_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
