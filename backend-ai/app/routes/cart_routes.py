from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.cart import CartCreate
from app.services.cart_service import CartService

router = APIRouter(
    prefix="/cart",
    tags=["Cart"]
)

@router.post("/add")
async def add_to_cart(
    payload: CartCreate,
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await CartService.add_to_cart(
        db,
        user_id,
        payload.product_id,
        payload.quantity
    )

@router.get("")
async def get_cart(
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await CartService.get_cart(
        db,
        user_id
    )

@router.delete("/{product_id}")
async def remove_from_cart(
    product_id: int,
    db: asyncpg.Connection = Depends(get_db)
):

    user_id = 1

    return await CartService.remove_from_cart(
        db,
        user_id,
        product_id
    )

