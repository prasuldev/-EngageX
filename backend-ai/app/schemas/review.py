from pydantic import BaseModel, Field
from typing import List

class ReviewCreate(BaseModel):
    order_id: int
    product_id: int
    rating: int = Field(..., ge=1, le=5)
    reasons: List[str] = []