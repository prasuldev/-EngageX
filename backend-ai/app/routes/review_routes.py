from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.review import ReviewCreate
from app.services.review_service import ReviewService
from app.auth.dependencies import get_current_customer

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)

@router.post("")
async def add_review(
    payload: ReviewCreate,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await ReviewService.add_review(
        db, current_user["id"], payload.order_id, payload.product_id, payload.rating, payload.reasons
    )

@router.get("/{product_id}")
async def get_reviews(
    product_id: int,
    db: asyncpg.Connection = Depends(get_db)
):
    return await ReviewService.get_product_reviews(db, product_id)