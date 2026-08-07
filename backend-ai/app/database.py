import asyncpg
import os
from typing import AsyncGenerator

# EngageX-specific database connection — independent of RP2
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://apple@localhost:5432/engagex_db"
)

pool: asyncpg.Pool | None = None

async def connect_db():
    global pool
    pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=1, max_size=10)
    print("✅ Connected to EngageX database")

async def disconnect_db():
    global pool
    if pool:
        await pool.close()
        print("🔌 Disconnected from EngageX database")

async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency — yields a connection from the EngageX pool."""
    async with pool.acquire() as connection:
        yield connection