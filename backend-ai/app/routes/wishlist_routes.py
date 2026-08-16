from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.wishlist import WishlistCreate
from app.services.wishlist_service import WishlistService

router = APIRouter(
    prefix="/wishlist",
    tags=["Wishlist"]
)

@router.post("/add")
async def add_wishlist(
    payload: WishlistCreate,
    db: asyncpg.Connection = Depends(get_db)
):
    user_id = 1  # temporary

    return await WishlistService.add_to_wishlist(
        db,
        user_id,
        payload.product_id
    )

@router.get("")
async def get_wishlist(
    db: asyncpg.Connection = Depends(get_db)
):
    user_id = 1

    return await WishlistService.get_wishlist(
        db,
        user_id
    )

@router.delete("/{product_id}")
async def remove_wishlist(
    product_id: int,
    db: asyncpg.Connection = Depends(get_db)
):
    user_id = 1

    return await WishlistService.remove_from_wishlist(
        db,
        user_id,
        product_id
    )