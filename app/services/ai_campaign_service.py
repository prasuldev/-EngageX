from fastapi import APIRouter, HTTPException

from app.schemas.ai_campaign import CampaignRequest
from app.services.ai_campaign_service import generate_ai_campaign

router = APIRouter(
    prefix="/ai",
    tags=["AI Campaign Generator"]
)


@router.post("/generate-campaign")
async def generate_campaign(data: CampaignRequest):
    try:
        result = generate_ai_campaign(data)

        return {
            "success": True,
            "campaign": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )