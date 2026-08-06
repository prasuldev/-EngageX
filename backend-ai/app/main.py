from dotenv import load_dotenv
import os
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import connect_db, disconnect_db
from app.auth.auth_routes import router as auth_router
from app.routes.product_routes import router as product_router
from app.routes.category_routes import router as category_router
from app.routes.chat_routes import router as chat_router
from app.routes.campaign_routes import router as campaign_router
from app.routes.dashboard_routes import router as dashboard_router
from routes.ai_campaign_routes import router as ai_campaign_router


app = FastAPI(title="EngageX API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await connect_db()

@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()

app.include_router(auth_router)
app.include_router(product_router)
app.include_router(category_router)
app.include_router(chat_router)
app.include_router(campaign_router)
app.include_router(dashboard_router)
app.include_router(ai_campaign_router)

@app.get("/")
def home():
    return {
        "message": "Welcome to EngageX API"
    }