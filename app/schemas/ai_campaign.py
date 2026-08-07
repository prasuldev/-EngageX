from pydantic import BaseModel


class CampaignRequest(BaseModel):
    product: str
    audience: str
    goal: str
    tone: str
    platform: str


class CampaignResponse(BaseModel):
    title: str
    description: str
    marketing_copy: str
    call_to_action: str
    poll_question: str
    hashtags: list[str]