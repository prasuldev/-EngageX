from pydantic import BaseModel


class PollCreate(BaseModel):
    campaign_id: int
    question: str
    option1: str
    option2: str
    option3: str | None = None
    option4: str | None = None


class PollResponse(PollCreate):
    id: int

    class Config:
        from_attributes = True