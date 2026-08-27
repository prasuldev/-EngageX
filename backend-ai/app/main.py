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
from app.routes.dashboard_ws import router as dashboard_ws_router
from app.routes.ai_campaign_routes import router as ai_campaign_router
from app.routes.wishlist_routes import router as wishlist_router
from app.routes.cart_routes import router as cart_router
from app.routes.address_routes import router as address_router
from app.routes.order_routes import router as order_router
from app.routes.review_routes import router as review_router
from app.routes.profile_routes import router as profile_router
from app.routes.admin_order_routes import router as admin_order_router
from app.routes.recommendation_routes import router as recommendation_router
from app.routes.activity_routes import router as activity_router

app = FastAPI(title="EngageX API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",

        "http://localhost:3001",
        "http://127.0.0.1:3001",

        "http://localhost:5500",
        "http://127.0.0.1:5500",

        # Production
        "https://engagex-customer-ui.onrender.com",
        "https://engagex-dashborad-ui.onrender.com",
    ],
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
app.include_router(dashboard_ws_router)
app.include_router(ai_campaign_router)
app.include_router(wishlist_router)
app.include_router(cart_router)
app.include_router(address_router)
app.include_router(order_router)
app.include_router(review_router)
app.include_router(profile_router)
app.include_router(admin_order_router)
app.include_router(recommendation_router)
app.include_router(activity_router)

@app.get("/")
def home():
    return {
        "message": "Welcome to EngageX API"
    }