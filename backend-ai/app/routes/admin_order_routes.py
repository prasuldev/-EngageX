from fastapi import APIRouter, Depends, HTTPException, Query
import asyncpg

from app.database import get_db
from app.schemas.order_status import OrderStatusUpdate
from app.services.order_admin_service import OrderAdminService
from app.auth.role_guard import require_role
from app.services.audit_service import log_action
from app.schemas.return_status import ReturnStatusUpdate

router = APIRouter(
    prefix="/admin/orders",
    tags=["Admin Orders"]
)

@router.get("")
async def list_orders(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    return await OrderAdminService.list_orders(db, status, limit, offset)

@router.get("/{order_id}")
async def get_order(
    order_id: int,
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    result = await OrderAdminService.get_order_detail(db, order_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

@router.put("/{order_id}/status")
async def update_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    result = await OrderAdminService.update_order_status(db, order_id, payload.status)
    if not result["success"]:
        status_code = 404 if result["message"] == "Order not found" else 400
        raise HTTPException(status_code=status_code, detail=result["message"])

    await log_action(db, current_user["id"], "order.status_updated", "order", order_id, {"status": payload.status})
    return result

@router.put("/{order_id}/return-status")
async def update_return_status(
    order_id: int,
    payload: ReturnStatusUpdate,
    db: asyncpg.Connection = Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    result = await OrderAdminService.update_return_status(db, order_id, payload.status)
    if not result["success"]:
        status_code = 404 if "No return request found" in result["message"] else 400
        raise HTTPException(status_code=status_code, detail=result["message"])

    await log_action(db, current_user["id"], "return.status_updated", "order", order_id, {"status": payload.status})
    return result