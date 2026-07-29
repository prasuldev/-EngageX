from app.models.survey import Survey
from app.routers.survey import router as survey_router
from app.models.quiz import Quiz
from app.routers.quiz import router as quiz_router
from fastapi import FastAPI
from app.models.poll import Poll
from app.routers.poll import router as poll_router
from app.database import Base, engine
from app.models.campaign import Campaign
from app.routers.campaign import router as campaign_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EngageX API")

# Register Campaign Router
app.include_router(campaign_router)

# Register Poll Router
app.include_router(poll_router)

# Register Quiz Router
app.include_router(quiz_router)

# Register Survey Router
app.include_router(survey_router)

@app.get("/")
def home():
    return {
        "message": "Welcome to EngageX API"
    }
