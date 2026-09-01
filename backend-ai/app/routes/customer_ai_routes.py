from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_customer
from app.database import get_db
from app.services.customer_ai_service import CustomerAIService

router = APIRouter(prefix="/api/customer/ai", tags=["Customer AI"])


@router.get("/home")
async def customer_ai_home(db=Depends(get_db), current_user=Depends(get_current_customer)):
    return await CustomerAIService.build_home_feed(db, current_user["id"])
