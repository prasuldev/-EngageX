from pydantic import BaseModel

class ActivityCreate(BaseModel):
    product_id: int
    activity_type: str