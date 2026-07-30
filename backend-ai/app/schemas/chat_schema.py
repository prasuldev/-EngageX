from pydantic import BaseModel
from typing import List, Optional


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    user_id: Optional[int] = None
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    products: list = []
    campaign: dict | None = None
    follow_up: list = []