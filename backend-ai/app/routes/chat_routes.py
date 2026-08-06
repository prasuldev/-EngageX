from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_db
from app.services.intent_service import IntentService
from app.services.product_service import ProductService
from app.ai.prompt_builder import PromptBuilder
from app.ai.llm_service import LLMService

router = APIRouter(tags=["chat"])

llm = LLMService()


class ChatRequest(BaseModel):
    message: str
    history: list = []
    user_id: int | None = None


@router.post("/chat")
async def chat(payload: ChatRequest, db=Depends(get_db)):

    try:

        # -----------------------------------------
        # Detect Intent
        # -----------------------------------------

        intent_data = IntentService.detect_intent(
            payload.message
        )

        intent = intent_data["intent"]
        category = intent_data["category"]
        ingredient = intent_data["ingredient"]
        min_price = intent_data["min_price"]
        max_price = intent_data["max_price"]

        # -----------------------------------------
        # Greeting (No DB, No Gemini)
        # -----------------------------------------

        if intent == "greeting":

            return {

                "reply": (
                    "Hi! 👋 I'm Aura. I can help you choose cleansers, moisturizers, eye creams, face masks, and sun protection products."
                ),

                "products": [],

                "follow_up": [
                    "Recommend a cleanser",
                    "Suggest a moisturizer",
                    "Recommend sunscreen"
                ]
            }

        # -----------------------------------------
        # Search Products
        # -----------------------------------------

        if intent in ["product_details", "comparison"]:

            products = await ProductService.find_products_by_name(
                db,
                payload.message
            )

        else:

            products = await ProductService.search_products(
                db=db,
                message=payload.message,
                category=category,
                ingredient=ingredient,
                intent=intent,
                min_price=min_price,
                max_price=max_price
            )

        # -----------------------------------------
        # Build Prompt
        # -----------------------------------------

        prompt = PromptBuilder.build_prompt(
            user_message=payload.message,
            history=payload.history,
            products=products,
            intent=intent
        )

        # -----------------------------------------
        # Gemini Response
        # -----------------------------------------

        reply = await llm.generate_reply(prompt)

        # -----------------------------------------
        # Save Chat
        # -----------------------------------------

        if payload.user_id:

            await db.execute(
                """
                INSERT INTO chat_history
                (user_id, message, response)
                VALUES ($1,$2,$3)
                """,
                payload.user_id,
                payload.message,
                reply
            )

        # -----------------------------------------
        # Return Response
        # -----------------------------------------

        return {

            "reply": reply,

            "products": [

                {
                    "id": p["id"],
                    "name": p["name"],
                    "brand": p["brand"],
                    "category": p["category"],
                    "price": float(p["price"]),
                    "rating": float(p["rating"])
                }

                for p in products

            ],

            "follow_up": []

        }

    except Exception as e:

        print("Chat Error:", e)

        raise HTTPException(
            status_code=500,
            detail="AI Assistant unavailable"
        )