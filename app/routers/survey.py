from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.survey import Survey
from app.schemas.survey import SurveyCreate

router = APIRouter(
    prefix="/surveys",
    tags=["Surveys"]
)


@router.post("/")
def create_survey(survey: SurveyCreate, db: Session = Depends(get_db)):
    new_survey = Survey(
        campaign_id=survey.campaign_id,
        question=survey.question,
        option1=survey.option1,
        option2=survey.option2,
        option3=survey.option3,
        option4=survey.option4
    )

    db.add(new_survey)
    db.commit()
    db.refresh(new_survey)

    return {
        "message": "Survey created successfully",
        "id": new_survey.id
    }
@router.get("/")
def get_all_surveys(db: Session = Depends(get_db)):
    surveys = db.query(Survey).all()
    return surveys

@router.get("/{survey_id}")
def get_survey_by_id(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if not survey:
        return {"message": "Survey not found"}

    return survey
@router.put("/{survey_id}")
def update_survey(survey_id: int, survey: SurveyCreate, db: Session = Depends(get_db)):
    existing_survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if not existing_survey:
        return {"message": "Survey not found"}

    existing_survey.campaign_id = survey.campaign_id
    existing_survey.question = survey.question
    existing_survey.option1 = survey.option1
    existing_survey.option2 = survey.option2
    existing_survey.option3 = survey.option3
    existing_survey.option4 = survey.option4

    db.commit()
    db.refresh(existing_survey)

    return {
        "message": "Survey updated successfully",
        "survey": existing_survey
    }
@router.delete("/{survey_id}")
def delete_survey(survey_id: int, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if not survey:
        return {"message": "Survey not found"}

    db.delete(survey)
    db.commit()

    return {
        "message": "Survey deleted successfully"
    }