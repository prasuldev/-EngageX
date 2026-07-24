from pydantic import BaseModel


class CampaignCreate(BaseModel):
    title: str
    description: str
    campaign_type: str
    status: str = "Draft"


class CampaignResponse(CampaignCreate):
    id: int

    class Config:
        from_attributes = True