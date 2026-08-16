import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database import get_db
from app.services.intent_service import IntentService
from app.services.product_service import ProductService
from app.ai.prompt_builder import PromptBuilder
from app.ai.llm_service import LLMService

router = APIRouter(tags=["chat"])
logger = logging.getLogger("engagex.chat")

llm = LLMService()

MAX_MESSAGE_LENGTH = 500


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)
    history: list = []
    user_id: int | None = None


def _is_rate_limit_error(exc: Exception) -> bool:
    """
    Heuristic check for Gemini quota/rate-limit errors.
    NOTE: verify this against the actual exception type raised by
    llm_service.py's underlying client (e.g. google.genai errors.ClientError,
    google.api_core.exceptions.ResourceExhausted) and catch that type directly
    if possible — this string-matching is a safety net, not a substitute.
    """
    text = str(exc).lower()
    return any(marker in text for marker in ("429", "quota", "rate limit", "resource_exhausted"))


@router.post("/chat")
async def chat(payload: ChatRequest, db=Depends(get_db)):

    # -----------------------------------------
    # Detect Intent
    # -----------------------------------------
    try:
        intent_data = IntentService.detect_intent(payload.message)
    except Exception:
        logger.exception("Intent detection failed")
        raise HTTPException(status_code=500, detail="AI Assistant unavailable")

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
                "Hi! 👋 I'm Aura. I can help you choose cleansers, "
                "moisturizers, eye creams, face masks, and sun protection products."
            ),
            "products": [],
            "follow_up": [
                "Recommend a cleanser",
                "Suggest a moisturizer",
                "Recommend sunscreen"
            ]
        }

    # -----------------------------------------
    # Purchase Steps (No Gemini — deterministic, no quota cost)
    # -----------------------------------------

    if intent == "purchase":

        matched_products = await ProductService.find_products_by_name(
            db, payload.message
        )

        if not matched_products and category:
            # No specific product named, but a category was detected
            # (e.g. "how do I buy a moisturizer") — use that for context.
            matched_products = await ProductService.search_products(
                db=db,
                message=payload.message,
                category=category,
                ingredient=None,
                intent=intent,
                min_price=min_price,
                max_price=max_price
            )

        product_name = matched_products[0]["name"] if matched_products else None

        intro = (
            f'Here\'s how to buy "{product_name}":'
            if product_name
            else "Here's how to buy any product on EngageX:"
        )

        steps_reply = (
            f"{intro}\n\n"
            "1. Open the product page and select a shade/size if applicable.\n"
            "2. Tap **Add to Cart**.\n"
            "3. Go to your cart to review items and quantities.\n"
            "4. Tap **Checkout** and confirm your shipping address.\n"
            "5. Choose a payment method and confirm your order.\n\n"
            "You'll get an order confirmation once it's placed."
        )

        return {
            "reply": steps_reply,
            "products": [],
            "follow_up": [
                "Show me best sellers",
                "What's on offer today?"
            ]
        }

    # -----------------------------------------
    # Search Products + Generate Reply
    # (failures in this block are genuine AI-assistant failures)
    # -----------------------------------------
    try:
        if intent in ["product_details", "comparison"]:
            products = await ProductService.find_products_by_name(db, payload.message)
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

        prompt = PromptBuilder.build_prompt(
            user_message=payload.message,
            history=payload.history,
            products=products,
            intent=intent
        )

        reply = await llm.generate_reply(prompt)

    except Exception as e:
        logger.exception("AI generation failed")
        if _is_rate_limit_error(e):
            raise HTTPException(
                status_code=429,
                detail="I'm getting a lot of requests right now — please try again shortly."
            )
        raise HTTPException(status_code=500, detail="AI Assistant unavailable")

    # -----------------------------------------
    # Save Chat — best-effort, must never discard a successful reply
    # -----------------------------------------
    #
    # NOTE: user_id currently comes straight from the client-supplied
    # request body, unauthenticated. Anyone can POST an arbitrary user_id
    # and have messages logged under someone else's account. Since JWT
    # auth already exists elsewhere in the project (jwt_utils.py,
    # role_guard.py), consider deriving user_id from the verified token
    # via a dependency instead of trusting the payload.

    if payload.user_id:
        try:
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
        except Exception:
            logger.exception(
                "Failed to persist chat_history for user_id=%s", payload.user_id
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