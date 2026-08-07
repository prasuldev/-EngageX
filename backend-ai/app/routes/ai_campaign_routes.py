from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/campaign", tags=["AI Campaign"])


class CampaignRequest(BaseModel):
    product: str
    audience: str
    goal: str


@router.post("/generate")
async def generate_campaign(data: CampaignRequest):
    campaign = {
        "title": f"{data.product} Campaign",
        "audience": data.audience,
        "goal": data.goal,
        "headline": f"Discover {data.product}",
        "description": f"This campaign targets {data.audience} to achieve {data.goal}."
    }

    return campaign