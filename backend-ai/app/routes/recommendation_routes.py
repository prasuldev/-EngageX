from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.services.recommendation_service import RecommendationService

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"]
)

@router.get("")
async def get_recommendations(
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await RecommendationService.get_recommendations(
        db,
        user_id
    )