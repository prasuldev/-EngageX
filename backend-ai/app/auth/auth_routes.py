from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.auth.password_utils import hash_password, verify_password
from app.auth.jwt_utils import create_access_token, decode_access_token
from app.services.audit_service import log_action

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UpdateProfileRequest(BaseModel):
    full_name: str
    email: EmailStr

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

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
    token = create_access_token({"sub": str(user["id"])})

    await log_action(db, user["id"], "auth.register", "user", user["id"])

    return {"access_token": token, "token_type": "bearer", "user": dict(user)}

@router.post("/login")
async def login(payload: LoginRequest, db=Depends(get_db)):
    user = await db.fetchrow(
        """
        SELECT u.*, r.name AS role
        FROM users u JOIN roles r ON u.role_id = r.id
        WHERE u.email = $1
        """,
        payload.email
    )
    if not user or not verify_password(payload.password, user["password_hash"]):
        await log_action(db, None, "auth.login_failed", "user", None, {"email": payload.email})
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["id"])})

    await log_action(db, user["id"], "auth.login_success", "user", user["id"])

    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "full_name": user["full_name"], "email": user["email"], "role": user["role"]}}

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
        """
        SELECT id
        FROM users
        WHERE email=$1
        AND id<>$2
        """,
        payload.email,
        current_user["id"]
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    updated = await db.fetchrow(
        """
        UPDATE users
        SET full_name=$1,
            email=$2
        WHERE id=$3
        RETURNING id, full_name, email
        """,
        payload.full_name,
        payload.email,
        current_user["id"]
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
    if not verify_password(
        payload.current_password,
        current_user["password_hash"]
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    new_hash = hash_password(payload.new_password)

    await db.execute(
        """
        UPDATE users
        SET password_hash=$1
        WHERE id=$2
        """,
        new_hash,
        current_user["id"]
    )

    await log_action(db, current_user["id"], "user.password_changed", "user", current_user["id"])

    return {
        "message": "Password changed successfully"
    }