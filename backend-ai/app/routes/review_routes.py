from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.review import ReviewCreate
from app.services.review_service import ReviewService

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)

@router.post("")
async def add_review(
    payload: ReviewCreate,
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await ReviewService.add_review(
        db,
        user_id,
        payload.product_id,
        payload.rating,
        payload.review
    )

@router.get("/{product_id}")
async def get_reviews(
    product_id: int,
    db: asyncpg.Connection = Depends(get_db)
):

    return await ReviewService.get_product_reviews(
        db,
        product_id
    )