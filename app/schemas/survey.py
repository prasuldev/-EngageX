from pydantic import BaseModel


class SurveyCreate(BaseModel):
    campaign_id: int
    question: str
    option1: str
    option2: str
    option3: str
    option4: str