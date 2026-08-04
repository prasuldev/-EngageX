"""
One-time enrichment: tags every product with AI-derived skin_types,
concerns, sensitivity_safe, and texture, so the Skin Twin campaign can
match products via a plain SQL filter instead of calling Gemini per user.

Re-runnable safely -- only tags products missing from product_tags.
"""

import asyncio
import json
import os
import httpx
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Reuses the same key convention as ai_recommender.py -- a dedicated key
# for this feature if set, falling back to the shared one.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY_SKIN_TWIN") or os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-3.5-flash-lite"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

VALID_SKIN_TYPES = ["dry", "oily", "combination", "sensitive", "normal"]
VALID_CONCERNS = ["acne", "aging", "dullness", "dryness", "sensitivity", "sun_damage", "pores"]


async def _call_gemini(prompt: str, retries: int = 1):
    async with httpx.AsyncClient(timeout=15.0) as client:
        for attempt in range(retries + 1):
            res = await client.post(
                GEMINI_URL,
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"response_mime_type": "application/json"}
                }
            )
            if res.status_code == 429 and attempt < retries:
                await asyncio.sleep(5)
                continue
            res.raise_for_status()
            data = res.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text)


def _build_tag_prompt(name, category, ingredients):
    return f"""Given this cosmetic product, return ONLY a JSON object, no markdown:
{{
  "skin_types": [subset of {VALID_SKIN_TYPES}],
  "concerns": [subset of {VALID_CONCERNS}],
  "sensitivity_safe": true or false,
  "texture": "cream, gel, oil, serum, balm, or liquid"
}}

Product: {name} ({category})
Ingredients: {(ingredients or "")[:800]}
"""


async def tag_product(name, category, ingredients):
    prompt = _build_tag_prompt(name, category, ingredients)
    try:
        parsed = await _call_gemini(prompt)
        if (
            isinstance(parsed.get("skin_types"), list)
            and isinstance(parsed.get("concerns"), list)
            and isinstance(parsed.get("sensitivity_safe"), bool)
        ):
            return parsed
    except Exception as e:
        print(f"  Gemini tagging failed: {e}")
    return None


async def enrich():
    if not GEMINI_API_KEY:
        print("No GEMINI_API_KEY set -- aborting, tagging requires it.")
        return

    conn = await asyncpg.connect(dsn=DATABASE_URL)

    products = await conn.fetch("""
        SELECT p.id, p.name, p.ingredients, c.name AS category
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE p.id NOT IN (SELECT product_id FROM product_tags)
    """)

    print(f"Found {len(products)} untagged products")

    for p in products:
        tags = await tag_product(p["name"], p["category"], p["ingredients"])
        if tags is None:
            print(f"FAILED: {p['id']} ({p['name']}) -- needs manual review")
            continue

        await conn.execute("""
            INSERT INTO product_tags (product_id, skin_types, concerns, sensitivity_safe, texture)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (product_id) DO UPDATE SET
                skin_types = $2, concerns = $3, sensitivity_safe = $4, texture = $5, tagged_at = NOW()
        """, p["id"], tags["skin_types"], tags["concerns"], tags["sensitivity_safe"], tags.get("texture"))

        print(f"Tagged {p['id']}: {p['name']} -> {tags['skin_types']} / {tags['concerns']}")
        await asyncio.sleep(4.5)  # stay under Gemini free-tier RPM

    await conn.close()


if __name__ == "__main__":
    asyncio.run(enrich())