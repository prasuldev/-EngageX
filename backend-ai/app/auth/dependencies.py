from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.database import get_db
from app.auth.jwt_utils import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def _decode(token: str):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

async def get_current_customer(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    payload = await _decode(token)
    if payload.get("scope") != "customer":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = await db.fetchrow(
        """
        SELECT u.*, r.name AS role
        FROM users u JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
        """,
        int(payload["sub"])
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_current_internal_user(token: str = Depends(oauth2_scheme), db=Depends(get_db)):
    payload = await _decode(token)
    if payload.get("scope") != "internal":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = await db.fetchrow(
        """
        SELECT iu.*, ir.name AS role
        FROM internal_users iu JOIN internal_roles ir ON iu.role_id = ir.id
        WHERE iu.id = $1
        """,
        int(payload["sub"])
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user