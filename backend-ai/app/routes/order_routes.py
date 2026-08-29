from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.order import PlaceOrderRequest
from app.services.order_service import OrderService
from app.auth.dependencies import get_current_customer

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)

@router.post("/place")
async def place_order(
    payload: PlaceOrderRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(get_current_customer)
):
    return await OrderService.place_order(
        db,
        current_user["id"],
        payload.address_id
    )

@router.get("")
async def get_orders(
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(get_current_customer)
):
    return await OrderService.get_orders(
        db,
        current_user["id"]
    )

@router.get("/{order_id}")
async def get_order_details(
    order_id: int,
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(get_current_customer)
):
    return await OrderService.get_order_details(
        db,
        current_user["id"],
        order_id
    )

@router.get("/{order_id}/track")
async def track_order(
    order_id: int,
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(get_current_customer)
):
    return await OrderService.track_order(
        db,
        current_user["id"],
        order_id
    )