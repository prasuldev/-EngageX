from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.services.profile_service import ProfileService

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

@router.get("")
async def profile_dashboard(
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await ProfileService.get_profile_dashboard(
        db,
        user_id
    )