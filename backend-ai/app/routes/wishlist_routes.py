from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.wishlist import WishlistCreate
from app.services.wishlist_service import WishlistService
from app.auth.dependencies import get_current_customer

router = APIRouter(
    prefix="/wishlist",
    tags=["Wishlist"]
)

@router.post("/add")
async def add_wishlist(
    payload: WishlistCreate,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await WishlistService.add_to_wishlist(db, current_user["id"], payload.product_id)

@router.get("")
async def get_wishlist(
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await WishlistService.get_wishlist(db, current_user["id"])

@router.delete("/{product_id}")
async def remove_wishlist(
    product_id: int,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await WishlistService.remove_from_wishlist(db, current_user["id"], product_id)