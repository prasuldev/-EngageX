from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import connect_db, disconnect_db
from auth.auth_routes import router as auth_router
from routes.product_routes import router as product_router
from routes.category_routes import router as category_router
from routes.chat_routes import router as chat_router
from routes.campaign_routes import router as campaign_router


from app.database import Base, engine
from app.models.campaign import Campaign
from app.routes.campaign import router as campaign_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EngageX API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# Register Campaign Router
app.include_router(campaign_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to EngageX API"
    }