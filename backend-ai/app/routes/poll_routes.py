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
@router.get("/{poll_id}")
def get_poll_by_id(poll_id: int, db: Session = Depends(get_db)):
    poll = db.query(Poll).filter(Poll.id == poll_id).first()

    if not poll:
        return {"message": "Poll not found"}

    return poll
@router.put("/{poll_id}")
def update_poll(poll_id: int, poll: PollCreate, db: Session = Depends(get_db)):
    existing_poll = db.query(Poll).filter(Poll.id == poll_id).first()

    if not existing_poll:
        return {"message": "Poll not found"}

    existing_poll.campaign_id = poll.campaign_id
    existing_poll.question = poll.question
    existing_poll.option1 = poll.option1
    existing_poll.option2 = poll.option2
    existing_poll.option3 = poll.option3
    existing_poll.option4 = poll.option4

    db.commit()
    db.refresh(existing_poll)

    return {
        "message": "Poll updated successfully",
        "poll": existing_poll
    }