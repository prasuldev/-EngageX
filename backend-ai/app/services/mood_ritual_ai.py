"""
AI-generated captions for the Mood Ritual campaign.

Flow:
  1. User picks a mood (e.g. "Running on empty").
  2. Backend resolves real products per relevant category (see
     mood_ritual_resolver.py -- no AI involved in product selection).
  3. Resolved product names go to Gemini, which writes one short,
     casual caption per product explaining why it fits the mood.
  4. Any Gemini failure falls back to a generic caption so the
     feature never breaks.
"""

import json
import os
import asyncio
import httpx
from app.config import GEMINI_MODEL

# Dedicated key for this feature, falls back to shared key if unset --
# same pattern as GEMINI_API_KEY_POLL.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY_MOOD") or os.getenv("GEMINI_API_KEY")

GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)


async def _call_gemini(prompt: str, retries: int = 1):
    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt in range(retries + 1):
            res = await client.post(
                GEMINI_URL,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"response_mime_type": "application/json"}
                }
            )
            if res.status_code == 429 and attempt < retries:
                await asyncio.sleep(2)
                continue
            res.raise_for_status()
            data = res.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text)


def _fallback_captions(products: dict) -> dict:
    return {
        category: f"Picked for you: {name}"
        for category, name in products.items()
        if name
    }


async def generate_mood_captions(mood_label: str, products: dict) -> dict:
    """
    products: {category_name: product_name, ...} -- only resolved
    (non-null) categories should be passed in.

    Returns: {category_name: caption, ...} -- one short casual caption
    per product. Falls back to a generic caption per product on any
    Gemini failure.
    """
    fallback = _fallback_captions(products)

    if not GEMINI_API_KEY or not products:
        return fallback

    product_lines = "\n".join(
        f'- category="{cat}", product_name="{name}"'
        for cat, name in products.items()
    )

    prompt = f"""You are writing short, casual captions for a skincare
routine-builder feature. A user picked the mood "{mood_label}", and was
matched to these real products:
{product_lines}

Write one short caption per product explaining why it fits this mood.
The product name is already shown separately above the caption, so do
NOT repeat the product name in your caption -- write as if the reader
already knows what product this is about.

Rules:
- Max 10 words per caption.
- Casual, warm, slightly playful tone -- like a friend, not a dermatologist.
- No clinical language ("hydration barrier", "active ingredients", "formulated to").
- No exclamation points overload -- at most one across all captions.
- Never mention a product name (the user already sees it above).

Respond with ONLY a JSON object, no markdown, no other text, in this
exact shape:
{{"category_name_1": "caption text", "category_name_2": "caption text"}}
"""

    try:
        parsed = await _call_gemini(prompt)
        if isinstance(parsed, dict) and parsed:
            # Guard: only keep captions for categories we actually sent,
            # so Gemini can't inject an unexpected key into the response.
            cleaned = {k: v for k, v in parsed.items() if k in products and isinstance(v, str)}
            if cleaned:
                return cleaned
    except Exception as e:
        print(f"Gemini mood caption generation failed, using fallback: {e}")

    return fallback