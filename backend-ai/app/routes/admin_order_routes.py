from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.order_status import OrderStatusUpdate
from app.services.order_admin_service import OrderAdminService

router = APIRouter(
    prefix="/admin/orders",
    tags=["Admin Orders"]
)

@router.put("/{order_id}/status")
async def update_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: asyncpg.Connection = Depends(get_db)
):

    return await OrderAdminService.update_order_status(
        db,
        order_id,
        payload.status
    )