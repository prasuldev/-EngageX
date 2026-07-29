from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.quiz import Quiz
from app.schemas.quiz import QuizCreate

router = APIRouter(
    prefix="/quizzes",
    tags=["Quizzes"]
)


@router.post("/")
def create_quiz(quiz: QuizCreate, db: Session = Depends(get_db)):
    new_quiz = Quiz(
        campaign_id=quiz.campaign_id,
        question=quiz.question,
        option1=quiz.option1,
        option2=quiz.option2,
        option3=quiz.option3,
        option4=quiz.option4,
        correct_answer=quiz.correct_answer
    )

    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)

    return {
        "message": "Quiz created successfully",
        "id": new_quiz.id
    }
@router.get("/")
def get_all_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).all()
    return quizzes
@router.get("/{quiz_id}")
def get_quiz_by_id(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()

    if not quiz:
        return {"message": "Quiz not found"}

    return quiz
@router.put("/{quiz_id}")
def update_quiz(quiz_id: int, quiz: QuizCreate, db: Session = Depends(get_db)):
    existing_quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()

    if not existing_quiz:
        return {"message": "Quiz not found"}

    existing_quiz.campaign_id = quiz.campaign_id
    existing_quiz.question = quiz.question
    existing_quiz.option1 = quiz.option1
    existing_quiz.option2 = quiz.option2
    existing_quiz.option3 = quiz.option3
    existing_quiz.option4 = quiz.option4
    existing_quiz.correct_answer = quiz.correct_answer

    db.commit()
    db.refresh(existing_quiz)

    return {
        "message": "Quiz updated successfully",
        "quiz": existing_quiz
    }
@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()

    if not quiz:
        return {"message": "Quiz not found"}

    db.delete(quiz)
    db.commit()

    return {
        "message": "Quiz deleted successfully"
    }