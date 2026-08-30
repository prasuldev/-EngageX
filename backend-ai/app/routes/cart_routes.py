from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.database import get_db
from app.schemas.cart import CartCreate, CartUpdate
from app.services.cart_service import CartService
from app.auth.dependencies import get_current_customer

router = APIRouter(
    prefix="/cart",
    tags=["Cart"]
)

@router.post("/add")
async def add_to_cart(
    payload: CartCreate,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await CartService.add_to_cart(db, current_user["id"], payload.product_id, payload.quantity)


@router.get("")
async def get_cart(
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await CartService.get_cart(db, current_user["id"])


@router.patch("/{product_id}")
async def update_cart_quantity(
    product_id: int,
    payload: CartUpdate,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    updated = await CartService.update_quantity(db, current_user["id"], product_id, payload.quantity)
    if not updated:
        raise HTTPException(status_code=404, detail="Item not in cart")
    return updated


@router.delete("/{product_id}")
async def remove_from_cart(
    product_id: int,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    return await CartService.remove_from_cart(db, current_user["id"], product_id)