import json

async def log_action(db, user_id, action, resource_type=None, resource_id=None, details=None):
    await db.execute(
        """INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
           VALUES ($1, $2, $3, $4, $5)""",
        user_id, action, resource_type, resource_id,
        json.dumps(details) if details is not None else None
    )