from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.poll import Poll
from app.schemas.poll import PollCreate

router = APIRouter(
    prefix="/polls",
    tags=["Polls"]
)


@router.post("/")
def create_poll(poll: PollCreate, db: Session = Depends(get_db)):
    new_poll = Poll(
        campaign_id=poll.campaign_id,
        question=poll.question,
        option1=poll.option1,
        option2=poll.option2,
        option3=poll.option3,
        option4=poll.option4
    )

    db.add(new_poll)
    db.commit()
    db.refresh(new_poll)

    return {
        "message": "Poll created successfully",
        "id": new_poll.id
    }


@router.get("/")
def get_all_polls(db: Session = Depends(get_db)):
    polls = db.query(Poll).all()
    return polls