from fastapi import APIRouter, Depends
import asyncpg

from app.database import get_db
from app.schemas.order_status import OrderStatusUpdate
from app.services.order_admin_service import OrderAdminService
from app.auth.role_guard import require_role
from app.services.audit_service import log_action

router = APIRouter(
    prefix="/admin/orders",
    tags=["Admin Orders"]
)

@router.put("/{order_id}/status")
async def update_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    result = await OrderAdminService.update_order_status(db, order_id, payload.status)
    await log_action(db, current_user["id"], "order.status_updated", "order", order_id, {"status": payload.status})
    return result