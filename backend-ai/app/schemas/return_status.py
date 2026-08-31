from pydantic import BaseModel, field_validator

class ReturnStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def strip_status(cls, v: str) -> str:
        return v.strip()