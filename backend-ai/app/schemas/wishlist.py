from pydantic import BaseModel

class WishlistCreate(BaseModel):
    product_id: int