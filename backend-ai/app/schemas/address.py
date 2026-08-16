from pydantic import BaseModel

class AddressCreate(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: str | None = None
    city: str
    state: str
    pincode: str
    country: str = "India"
    is_default: bool = False