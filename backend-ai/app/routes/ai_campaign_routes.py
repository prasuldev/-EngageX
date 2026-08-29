from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.database import get_db
from app.ai.llm_service import LLMService
from app.auth.role_guard import require_role
from app.services.audit_service import log_action

router = APIRouter(prefix="/campaign", tags=["AI Campaign"])


class CampaignRequest(BaseModel):
    product: str
    audience: str
    goal: str


@router.post("/generate")
async def generate_campaign(
    data: CampaignRequest,
    current_user=Depends(require_role(["admin", "marketing_manager"])),
    db=Depends(get_db)
):

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

    await log_action(db, current_user["id"], "campaign.ai_generated", "campaign", None, {"product": data.product})

    return {
        "product": data.product,
        "audience": data.audience,
        "goal": data.goal,
        "campaign": ai_response
    }