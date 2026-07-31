from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_db
import os
import google.generativeai as genai

router = APIRouter(tags=["chat"])

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

class ChatRequest(BaseModel):
    message: str
    user_id: int | None = None

SYSTEM_PROMPT = """You are the AI Beauty Assistant for Maquillage, a cosmetics and skincare store.
You help customers with:
- Product recommendations based on skin type/concerns
- Explaining ingredients in skincare products
- Comparing products
- Basic skincare advice
- Order tracking questions (redirect to their Orders page)

Keep responses concise, friendly, and focused on skincare/cosmetics. If asked about something
unrelated to beauty/skincare, politely redirect the conversation back to how you can help with
their skincare needs."""

@router.post("/chat")
async def chat(payload: ChatRequest, db=Depends(get_db)):
    try:
        prompt = f"{SYSTEM_PROMPT}\n\nUser: {payload.message}"

        response = model.generate_content(prompt)
        reply = response.text

        if payload.user_id:
            await db.execute(
                "INSERT INTO chat_history (user_id, message, response) VALUES ($1, $2, $3)",
                payload.user_id, payload.message, reply
            )

        return {"reply": reply}

    except Exception as e:
        print("Chat error:", e)
        raise HTTPException(status_code=500, detail="AI Assistant is temporarily unavailable")