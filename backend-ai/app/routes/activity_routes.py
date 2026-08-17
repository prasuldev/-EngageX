from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.activity import ActivityCreate
from app.services.activity_service import ActivityService

router = APIRouter(
    prefix="/activity",
    tags=["Activity"]
)

@router.post("")
async def create_activity(
    payload: ActivityCreate,
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await ActivityService.log_activity(
        db,
        user_id,
        payload.product_id,
        payload.activity_type
    )