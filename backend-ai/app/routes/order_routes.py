from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.database import get_db
from app.schemas.order import PlaceOrderRequest, ReturnRequestCreate
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
        db, current_user["id"], payload.address_id, payload.payment_method, payload.product_ids
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

@router.patch("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    result = await OrderService.cancel_order(db, current_user["id"], order_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if result.get("error"):
        raise HTTPException(status_code=409, detail=result["message"])
    return result


@router.post("/{order_id}/return")
async def request_return(
    order_id: int,
    payload: ReturnRequestCreate,
    current_user=Depends(get_current_customer),
    db: asyncpg.Connection = Depends(get_db)
):
    result = await OrderService.request_return(
        db, current_user["id"], order_id, payload.request_type, payload.reason
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if result.get("error"):
        raise HTTPException(status_code=409, detail=result["message"])
    return result