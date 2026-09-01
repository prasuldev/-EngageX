from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.auth.dependencies import get_current_customer
from app.services.recommendation_service import RecommendationService

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"]
)

@router.get("")
async def get_recommendations(
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(get_current_customer),
):
    return await RecommendationService.get_recommendations(
        db,
        current_user["id"]
    )
