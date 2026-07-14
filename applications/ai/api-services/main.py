from contextlib import asynccontextmanager

from fastapi import FastAPI

from db.mongodb import connect_db, close_db
from routes.inference import router as inference_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # connect on startup, disconnect on shutdown
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="CityPulse Inference API",
    description="Parking occupancy detection inference service",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(inference_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
