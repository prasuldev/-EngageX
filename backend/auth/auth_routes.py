from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from database import get_db
from auth.password_utils import hash_password, verify_password
from auth.jwt_utils import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

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
    return {"access_token": token, "token_type": "bearer", "user": dict(user)}

@router.post("/login")
async def login(payload: LoginRequest, db=Depends(get_db)):
    user = await db.fetchrow("SELECT * FROM users WHERE email=$1", payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["id"])})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user["id"], "full_name": user["full_name"]}}