from motor.motor_asyncio import AsyncIOMotorClient

from config import MONGO_URI, MONGO_DB

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    """Open the Motor connection and create required indexes. Called once at startup."""
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]

    # auto-delete inference records after 30 days
    await db.inferences.create_index(
        "created_at",
        expireAfterSeconds=60 * 60 * 24 * 30
    )


async def close_db():
    """Close the Motor connection on shutdown."""
    global client
    if client:
        client.close()


def get_collection(name: str):
    """Return a collection by name. Use this in routes instead of accessing db directly."""
    return db[name]
