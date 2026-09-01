from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.database import get_db
from app.schemas.activity import ActivityCreate
from app.services.activity_service import ActivityService
from app.auth.dependencies import get_current_customer

router = APIRouter(
    prefix="/activity",
    tags=["Activity"]
)

@router.post("")
async def create_activity(
    payload: ActivityCreate,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    if payload.activity_type != "product_view":
        raise HTTPException(status_code=400, detail="Unsupported activity type")

    await ActivityService.log_activity(
        db,
        current_user["id"],
        payload.product_id,
        payload.activity_type
    )
    return {"success": True}
