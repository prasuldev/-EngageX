from fastapi import Depends, HTTPException, status
from app.auth.dependencies import get_current_internal_user

def require_role(allowed_roles: list[str]):
    async def checker(current_user=Depends(get_current_internal_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return checker