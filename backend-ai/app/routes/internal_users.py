from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from app.database import get_db
from app.auth.role_guard import require_role
from app.auth.dependencies import get_current_internal_user
from app.auth.password_utils import hash_password, verify_password
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/internal/users", tags=["internal-users"])

class CreateInternalUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=16)
    role: str

class ChangeInternalPasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=16)

@router.get("")
async def list_internal_users(
    current_user=Depends(require_role(["admin"])),
    db=Depends(get_db)
):
    rows = await db.fetch(
        """
        SELECT
            iu.id, iu.full_name, iu.email, ir.name AS role,
            iu.is_active, iu.created_at,
            MAX(al.created_at) AS last_active,
            (MAX(al.created_at) > NOW() - INTERVAL '5 minutes') AS is_online
        FROM internal_users iu
        JOIN internal_roles ir ON iu.role_id = ir.id
        LEFT JOIN audit_logs al ON al.user_id = iu.id
        GROUP BY iu.id, iu.full_name, iu.email, ir.name, iu.is_active, iu.created_at
        ORDER BY iu.created_at
        """
    )
    return [dict(r) for r in rows]

@router.post("")
async def create_internal_user(
    payload: CreateInternalUserRequest,
    current_user=Depends(require_role(["admin"])),
    db=Depends(get_db)
):
    role_row = await db.fetchrow("SELECT id FROM internal_roles WHERE name = $1", payload.role)
    if not role_row:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing = await db.fetchrow("SELECT id FROM internal_users WHERE email = $1", payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(payload.password)
    user = await db.fetchrow(
        """INSERT INTO internal_users (full_name, email, password_hash, role_id)
           VALUES ($1, $2, $3, $4) RETURNING id, full_name, email""",
        payload.full_name, payload.email, hashed, role_row["id"]
    )
    await log_action(db, current_user["id"], "internal_user.created", "internal_user", user["id"], {"role": payload.role})
    return dict(user)

@router.delete("/{user_id}")
async def delete_internal_user(
    user_id: int,
    current_user=Depends(require_role(["admin"])),
    db=Depends(get_db)
):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    target = await db.fetchrow("SELECT id, full_name, email FROM internal_users WHERE id = $1", user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Team member not found")

    async with db.transaction():
        # detach audit history so the FK doesn't block the delete, regardless of how it was defined
        await db.execute("UPDATE audit_logs SET user_id = NULL WHERE user_id = $1", user_id)
        await db.execute("DELETE FROM internal_users WHERE id = $1", user_id)

    await log_action(
        db, current_user["id"], "internal_user.deleted", "internal_user", user_id,
        {"deleted_full_name": target["full_name"], "deleted_email": target["email"]}
    )
    return {"message": "Team member removed"}

@router.get("/team-overview")
async def team_overview(
    current_user=Depends(require_role(["admin"])),
    db=Depends(get_db)
):
    rows = await db.fetch(
        """
        SELECT
            iu.id,
            iu.full_name,
            iu.email,
            ir.name AS role,
            COUNT(*) FILTER (WHERE al.action = 'campaign.ai_generated') AS campaigns_generated,
            COUNT(*) FILTER (WHERE al.action = 'order.status_updated') AS orders_updated,
            MAX(al.created_at) AS last_active
        FROM internal_users iu
        JOIN internal_roles ir ON iu.role_id = ir.id
        LEFT JOIN audit_logs al ON al.user_id = iu.id
        GROUP BY iu.id, iu.full_name, iu.email, ir.name
        ORDER BY last_active DESC NULLS LAST
        """
    )
    return [dict(r) for r in rows]

@router.put("/me/password")
async def change_internal_password(
    payload: ChangeInternalPasswordRequest,
    current_user=Depends(get_current_internal_user),
    db=Depends(get_db)
):
    if not verify_password(payload.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = hash_password(payload.new_password)
    await db.execute("UPDATE internal_users SET password_hash=$1 WHERE id=$2", new_hash, current_user["id"])
    return {"message": "Password changed successfully"}