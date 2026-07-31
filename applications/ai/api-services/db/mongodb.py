import logging

from motor.motor_asyncio import AsyncIOMotorClient

from config import MONGO_URI, MONGO_DB

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient | None = None
db = None


async def connect_db() -> bool:
    """Open the connection and create required indexes. Called once at startup."""
    global client, db

    client = None
    db = None

    try:
        client = AsyncIOMotorClient(MONGO_URI)
        db = client[MONGO_DB]

        # auto-delete inference records after 30 days
        await db.inferences.create_index(
            "created_at",
            expireAfterSeconds=60 * 60 * 24 * 30,
        )
    except Exception as exc:
        logger.warning("MongoDB unavailable during startup: %s", exc)
        client = None
        db = None
        return False

    return True


async def close_db():
    """Close the Motor connection on shutdown."""
    global client
    if client:
        client.close()
        client = None


def get_collection(name: str):
    """Return a collection by name. Use this in routes instead of accessing db directly."""
    if db is None:
        raise RuntimeError("database unavailable")
    return db[name]
