from fastapi import APIRouter
from pydantic import BaseModel

from app.ai.llm_service import LLMService

router = APIRouter(prefix="/campaign", tags=["AI Campaign"])


class CampaignRequest(BaseModel):
    product: str
    audience: str
    goal: str


@router.post("/generate")
async def generate_campaign(data: CampaignRequest):

    prompt = f"""
You are an expert marketing campaign strategist.

Create a marketing campaign for:

Product: {data.product}
Target audience: {data.audience}
Goal: {data.goal}

Return the campaign with these sections:

Title:
Headline:
Description:
Call to Action:
"""

    llm = LLMService()
    ai_response = await llm.generate_reply(prompt)

    return {
        "product": data.product,
        "audience": data.audience,
        "goal": data.goal,
        "campaign": ai_response
    }


