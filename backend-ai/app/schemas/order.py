from pydantic import BaseModel
from typing import Optional

class PlaceOrderRequest(BaseModel):
    address_id: int
    payment_method: str = "COD"
    product_ids: Optional[list[int]] = None

class ReturnRequestCreate(BaseModel):
    request_type: str  # "return" or "exchange"
    reason: str