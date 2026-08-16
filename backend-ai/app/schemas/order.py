from pydantic import BaseModel

class PlaceOrderRequest(BaseModel):
    address_id: int