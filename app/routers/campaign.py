from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.campaign import Campaign
from app.schemas.campaign import CampaignCreate

router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"]
)


@router.post("/")
def create_campaign(campaign: CampaignCreate, db: Session = Depends(get_db)):
    new_campaign = Campaign(
        title=campaign.title,
        description=campaign.description,
        campaign_type=campaign.campaign_type,
        status=campaign.status
    )

    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    return {
        "message": "Campaign created successfully",
        "id": new_campaign.id
    }
@router.get("/")
def get_all_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).all()

    return campaigns