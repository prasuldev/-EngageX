import os
import secrets
import hashlib
from datetime import datetime, timedelta
from app.services.email_service import send_reset_email
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field
from app.database import get_db
from app.auth.password_utils import hash_password, verify_password
from app.auth.jwt_utils import create_access_token, decode_access_token
from app.services.audit_service import log_action

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=16)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UpdateProfileRequest(BaseModel):
    full_name: str
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=16)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=16)

FRONTEND_RESET_URL_CUSTOMER = os.getenv("FRONTEND_RESET_URL_CUSTOMER", "http://127.0.0.1:5500/customer-app/pages/reset-password.html")
FRONTEND_RESET_URL_INTERNAL = os.getenv("FRONTEND_RESET_URL_INTERNAL", "http://127.0.0.1:5500/frontend/internal/reset-password.html")


@router.post("/register")
async def register(payload: RegisterRequest, db=Depends(get_db)):
    existing = await db.fetchrow("SELECT id FROM users WHERE email=$1", payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_password(payload.password)
    user = await db.fetchrow(
        """INSERT INTO users (full_name, email, password_hash)
           VALUES ($1, $2, $3) RETURNING id, full_name, email""",
        payload.full_name, payload.email, hashed
    )
    token = create_access_token({"sub": str(user["id"]), "scope": "customer"})

    await log_action(db, user["id"], "auth.register", "user", user["id"])

    return {"access_token": token, "token_type": "bearer", "user": dict(user)}


@router.post("/login")
async def login(payload: LoginRequest, db=Depends(get_db)):
    # Try customer table first
    user = await db.fetchrow(
        """
        SELECT u.*, r.name AS role, 'customer' AS scope
        FROM users u JOIN roles r ON u.role_id = r.id
        WHERE u.email = $1
        """,
        payload.email
    )

    # Fall back to internal table
    if not user:
        user = await db.fetchrow(
            """
            SELECT iu.*, ir.name AS role, 'internal' AS scope
            FROM internal_users iu JOIN internal_roles ir ON iu.role_id = ir.id
            WHERE iu.email = $1
            """,
            payload.email
        )

    if not user or not verify_password(payload.password, user["password_hash"]):
        await log_action(db, None, "auth.login_failed", "user", None, {"email": payload.email})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["id"]), "scope": user["scope"]})

    await log_action(db, user["id"], "auth.login_success", "user", user["id"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "full_name": user["full_name"], "email": user["email"], "role": user["role"]}
    }


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db)
):
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])

    user = await db.fetchrow(
        """
        SELECT u.*, r.name AS role
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
        """,
        user_id
    )

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user

@router.put("/profile")
async def update_profile(
    payload: UpdateProfileRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    existing = await db.fetchrow(
        "SELECT id FROM users WHERE email=$1 AND id<>$2",
        payload.email,
        current_user["id"]
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    updated = await db.fetchrow(
        """
        UPDATE users SET full_name=$1, email=$2 WHERE id=$3
        RETURNING id, full_name, email
        """,
        payload.full_name, payload.email, current_user["id"]
    )

    await log_action(
        db, current_user["id"], "user.profile_updated", "user", current_user["id"],
        {"old_email": current_user["email"], "new_email": payload.email}
    )
    return dict(updated)

@router.put("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db=Depends(get_db)
):
    if not verify_password(payload.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = hash_password(payload.new_password)
    await db.execute("UPDATE users SET password_hash=$1 WHERE id=$2", new_hash, current_user["id"])

    await log_action(db, current_user["id"], "user.password_changed", "user", current_user["id"])
    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db=Depends(get_db)):
    # Check customer table, then internal
    user = await db.fetchrow("SELECT id FROM users WHERE email = $1", payload.email)
    scope = "customer"
    if not user:
        user = await db.fetchrow("SELECT id FROM internal_users WHERE email = $1", payload.email)
        scope = "internal"

    # Always return the same response — don't reveal whether the email exists
    if user:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.utcnow() + timedelta(minutes=5)

        await db.execute(
            """INSERT INTO password_reset_tokens (scope, user_id, token_hash, expires_at)
               VALUES ($1, $2, $3, $4)""",
            scope, user["id"], token_hash, expires_at
        )

        base_url = FRONTEND_RESET_URL_CUSTOMER if scope == "customer" else FRONTEND_RESET_URL_INTERNAL
        reset_link = f"{base_url}?token={raw_token}"       
        sender_name = "Maquillage" if scope == "customer" else "EngageX Internal"
        await send_reset_email(payload.email, reset_link, sender_name)

    return {"message": "If that email is registered, a reset link has been sent."}

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db=Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()

    record = await db.fetchrow(
        """SELECT * FROM password_reset_tokens
           WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()""",
        token_hash
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    new_hash = hash_password(payload.new_password)
    table = "users" if record["scope"] == "customer" else "internal_users"

    await db.execute(f"UPDATE {table} SET password_hash=$1 WHERE id=$2", new_hash, record["user_id"])
    await db.execute("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", record["id"])

    return {"message": "Password reset successfully"}