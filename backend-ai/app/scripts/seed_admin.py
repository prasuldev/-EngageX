from dotenv import load_dotenv
load_dotenv()

import asyncio
from app import database
from app.auth.password_utils import hash_password

async def seed_admin():
    await database.connect_db()
    async with database.pool.acquire() as conn:
        role_row = await conn.fetchrow("SELECT id FROM roles WHERE name = 'admin'")
        if not role_row:
            raise RuntimeError("admin role not found — run roles_migration.sql first")

        await conn.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role_id)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO NOTHING
            """,
            "EngageX Admin",
            "admin@engagex.com",
            hash_password("change-me-immediately"),
            role_row["id"],
        )
    print("✅ Admin seeded.")
    await database.disconnect_db()

if __name__ == "__main__":
    asyncio.run(seed_admin())