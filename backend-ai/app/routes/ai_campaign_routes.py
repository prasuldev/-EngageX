from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(
    prefix="/ai",
    tags=["AI Campaign Generator"]
)


class CampaignRequest(BaseModel):
    product: str
    audience: str
    goal: str
    tone: str


@router.post("/generate-campaign")
async def generate_campaign(data: CampaignRequest):

    return {
        "title": f"{data.product} Campaign",
        "description": f"Launch a {data.tone.lower()} campaign for {data.audience}.",
        "cta": "Sign up today!",
        "poll": f"What interests you most about {data.product}?"
    }