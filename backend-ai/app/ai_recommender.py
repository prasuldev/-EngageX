"""
AI-assisted product quiz + recommendation for the poll campaign.

Flow:
  1. User picks a category (from the DB, via /products/categories).
  2. Backend asks Gemini to generate 2 short, category-specific
     multiple-choice questions on the fly -- e.g. Sunscreen gets asked
     about SPF/finish, Cleanser gets asked about oiliness. Cached per
     category so repeat visits get a consistent quiz and we're not
     hitting Gemini on every page load.
  3. User answers both. All the Q&A pairs + a real product shortlist from
     that category go to Gemini, which picks one product and writes a
     short reason naming the user's concern, a specific ingredient, and
     the value -- with a clear nudge to buy.
  4. Any Gemini failure at any step falls back to a safe default so the
     quiz never breaks.
"""

import json
import os
import asyncio
import httpx

# Uses a dedicated key for this feature if one is set, so it doesn't
# compete for quota with other Gemini usage (e.g. the AI assistant).
# Falls back to the shared key if GEMINI_API_KEY_POLL isn't configured.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY_POLL") or os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.5-flash-lite"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)



# In-memory cache of generated questions per category. Resets on server
# restart -- fine for this use case, keeps repeat visits consistent and
# avoids regenerating (and re-paying for) the same questions constantly.
_category_question_cache: dict[str, list[dict]] = {}

# In-memory cache of the final recommendation, keyed by the exact
# combination of category + answers. This means identical quiz runs
# (very common during your own testing, and plausible for real users
# picking the same path) reuse the same Gemini call instead of repeating
# it -- a meaningful reduction in call volume with no downside, since the
# same inputs should reasonably produce the same pick anyway.
_recommendation_cache: dict[str, dict] = {}

# Used only when Gemini is unavailable/failing. Matched against the
# category name by keyword, so even the fallback stays relevant instead
# of asking the same generic questions for every category.
FALLBACK_QUESTION_SETS = {
    "sunscreen": [
        {"question_text": "What finish do you prefer?",
         "options": ["Matte", "Dewy/glowy", "No white cast", "No preference"]},
        {"question_text": "How much sun exposure will you get?",
         "options": ["Minimal (mostly indoors)", "Moderate (daily commute)", "Extensive (outdoors all day)"]},
    ],
    "cleanser": [
        {"question_text": "How does your skin feel by midday?",
         "options": ["Oily/shiny", "Dry/tight", "Balanced", "Varies"]},
        {"question_text": "What texture do you prefer?",
         "options": ["Foaming", "Gel", "Cream/balm", "No preference"]},
    ],
    "moisturizer": [
        {"question_text": "How would you describe your skin?",
         "options": ["Dry", "Oily", "Combination", "Sensitive"]},
        {"question_text": "What texture do you prefer?",
         "options": ["Lightweight gel", "Rich cream", "No preference"]},
    ],
    "serum": [
        {"question_text": "What's your main skin concern?",
         "options": ["Dullness/uneven tone", "Fine lines", "Acne/breakouts", "Dehydration"]},
        {"question_text": "How often will you use this?",
         "options": ["Daily", "A few times a week", "Not sure yet"]},
    ],
    "toner": [
        {"question_text": "What do you want your toner to do?",
         "options": ["Minimize pores", "Hydrate", "Exfoliate gently", "Balance pH"]},
        {"question_text": "Are you sensitive to alcohol-based products?",
         "options": ["Yes, avoid alcohol", "No, it's fine", "Not sure"]},
    ],
    "acne": [
        {"question_text": "How would you describe your breakouts?",
         "options": ["Occasional", "Frequent", "Persistent/severe"]},
        {"question_text": "Any sensitivity to strong actives?",
         "options": ["Yes, go gentle", "No, bring it on"]},
    ],
    "lip": [
        {"question_text": "What's your main lip concern?",
         "options": ["Dryness/chapping", "Fine lines", "Discoloration", "Just maintenance"]},
        {"question_text": "Do you want SPF protection included?",
         "options": ["Yes", "No preference"]},
    ],
    "eye": [
        {"question_text": "What's your main under-eye concern?",
         "options": ["Dark circles", "Puffiness", "Fine lines", "Dryness"]},
        {"question_text": "How often will you use this?",
         "options": ["Morning & night", "Just at night", "Occasionally"]},
    ],
    "mask": [
        {"question_text": "What result are you looking for?",
         "options": ["Deep hydration", "Deep cleansing/detox", "Brightening", "Soothing/calming"]},
        {"question_text": "How often will you use it?",
         "options": ["Weekly ritual", "As-needed treatment", "Not sure yet"]},
    ],
}

GENERIC_FALLBACK_QUESTIONS = [
    {"question_text": "What's your main goal with this product?",
     "options": ["Prevent future issues", "Fix a current concern", "Just maintain what's working"]},
    {"question_text": "Any preference on formula feel?",
     "options": ["Lightweight & fast-absorbing", "Rich & deeply nourishing", "No strong preference"]},
]


def _get_fallback_questions(category: str) -> list[dict]:
    if not category:
        return GENERIC_FALLBACK_QUESTIONS

    category_lower = category.lower()
    for keyword, questions in FALLBACK_QUESTION_SETS.items():
        if keyword in category_lower:
            return questions

    return GENERIC_FALLBACK_QUESTIONS


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
                # Rate limited -- brief backoff, then try once more.
                # Won't help if it's a daily quota, only per-minute limits.
                await asyncio.sleep(2)
                continue
            res.raise_for_status()
            data = res.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text)


async def generate_category_questions(category: str) -> list[dict]:
    """
    Returns exactly 2 questions: [{question_text, options: [str, ...]}, ...]
    tailored to the given category. Cached per category.
    """
    if category in _category_question_cache:
        return _category_question_cache[category]

    if not GEMINI_API_KEY:
        return _get_fallback_questions(category)

    prompt = f"""You are designing a short skincare shopping quiz for the
"{category}" product category on an e-commerce site.

Write exactly 2 multiple-choice questions that would help figure out
exactly which {category} product a customer should buy. Each question
needs 3-4 short answer options (each under 6 words). Make the questions
genuinely specific to {category} -- not generic skincare questions.

Respond with ONLY a JSON array, no markdown, no other text, in this exact shape:
[
  {{"question_text": "...", "options": ["...", "...", "..."]}},
  {{"question_text": "...", "options": ["...", "...", "..."]}}
]
"""

    try:
        parsed = await _call_gemini(prompt)
        if (
            isinstance(parsed, list) and len(parsed) >= 2
            and all(
                isinstance(q.get("question_text"), str) and isinstance(q.get("options"), list)
                for q in parsed[:2]
            )
        ):
            questions = parsed[:2]
            _category_question_cache[category] = questions
            return questions
    except Exception as e:
        print(f"Gemini category-question generation failed, using fallback: {e}")

    return _get_fallback_questions(category)


async def _get_candidates(db, category: str, limit: int = 8):
    rows = await db.fetch(
        """
        SELECT p.id, p.name, p.price, p.rating, p.ingredients, p.image_url,
               b.name AS brand_name, c.name AS category_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        JOIN categories c ON p.category_id = c.id
        WHERE c.name = $1
        ORDER BY p.rating DESC NULLS LAST, p.id ASC
        LIMIT $2
        """,
        category, limit
    )
    return [dict(r) for r in rows]


def _build_recommendation_prompt(category, qa_pairs, candidates):
    qa_lines = "\n".join(f'- "{qa["question"]}" -> "{qa["answer"]}"' for qa in qa_pairs)
    candidate_lines = "\n".join(
        f"- id={c['id']}, name=\"{c['name']}\", price=₹{c['price']}, rating={c.get('rating')}, "
        f"ingredients={c.get('ingredients') or 'n/a'}"
        for c in candidates
    )

    return f"""You are a skincare sales assistant on an e-commerce site.

The customer is shopping in the "{category}" category and answered:
{qa_lines}

Candidate products (you MUST pick one of these exact ids -- never invent a product):
{candidate_lines}

Pick the single best match for this customer. Then write ONE short,
persuasive but honest sentence (max 30 words) that:
- names their specific concern based on their answers,
- mentions a real ingredient or benefit from the product data,
- and gives them a clear reason to buy it now.

Respond with ONLY a JSON object, no markdown, no other text:
{{"product_id": <id as a number>, "reason": "<your short reason to buy>"}}
"""


async def get_ai_recommendation(db, category: str, qa_pairs: list[dict]):
    cache_key = json.dumps(
        {"category": category, "qa": qa_pairs}, sort_keys=True
    )
    if cache_key in _recommendation_cache:
        return _recommendation_cache[cache_key]

    candidates = await _get_candidates(db, category)

    if not candidates:
        return None

    fallback = {
        "product": candidates[0],
        "reason": f"Our top pick in {category}.",
        "ai_generated": False
    }

    if not GEMINI_API_KEY:
        return fallback

    prompt = _build_recommendation_prompt(category, qa_pairs, candidates)
    candidate_ids = {c["id"] for c in candidates}

    try:
        parsed = await _call_gemini(prompt)
        product_id = parsed.get("product_id")
        reason = parsed.get("reason", "").strip()

        if product_id not in candidate_ids or not reason:
            return fallback

        matched_product = next(c for c in candidates if c["id"] == product_id)

        result = {
            "product": matched_product,
            "reason": reason,
            "ai_generated": True
        }
        _recommendation_cache[cache_key] = result
        return result
    except Exception as e:
        print(f"Gemini recommendation failed, using fallback: {e}")
        return fallback

async def generate_skin_blurb(skin_type: str, concerns: list[str]) -> str:
    """
    Short, cacheable summary for a skin profile combination. Called only
    on a cache miss in skin_profiles -- see campaign_routes.py.
    """
    fallback = (
        f"Here's a routine tailored for {skin_type} skin, "
        f"focused on {', '.join(concerns)}."
    )

    if not GEMINI_API_KEY:
        return fallback

    prompt = f"""Write a warm, 2-sentence skincare summary (max 40 words total)
for someone with {skin_type} skin whose main concerns are: {', '.join(concerns)}.
Do not mention any specific product names or brands.

Respond with ONLY a JSON object, no markdown, no other text:
{{"blurb": "<your 2-sentence summary>"}}
"""

    try:
        parsed = await _call_gemini(prompt)
        blurb = parsed.get("blurb", "").strip()
        return blurb if blurb else fallback
    except Exception as e:
        print(f"Gemini skin blurb generation failed, using fallback: {e}")
        return fallback

async def generate_skin_routine(skin_type: str, concerns: list[str], products: list[dict]) -> dict:
    """
    Product-tied routine: builds a real application sequence for the
    matched products, respecting actual skincare layering order and
    product-type constraints (e.g. SPF is AM-only, retinol/exfoliants
    are typically PM-only or not-daily, cleanser always comes first).

    Independent of generate_skin_blurb -- separate prompt, separate
    cache column (skin_profiles.routine_json), separate failure path.
    """
    fallback = {
        "steps": [
            {
                "product_name": p["name"],
                "when": "morning" if "sun protect" in (p.get("category_name") or "").lower() else "morning and evening",
                "frequency": "daily",
                "instructions": "Apply as directed on packaging."
            }
            for p in products[:3]
        ],
        "note": "A simple routine using your matched products."
    }

    if not GEMINI_API_KEY or not products:
        return fallback

    product_lines = "\n".join(
        f"- id={p['id']}, name=\"{p['name']}\", category=\"{p.get('category_name', '')}\""
        for p in products
    )

    prompt = f"""You are a skincare routine expert. A customer with
{skin_type} skin, concerned about {', '.join(concerns)}, was matched to
these products:
{product_lines}

Build a realistic daily routine using ONLY these exact products by name --
never invent a product, never rename one. Apply real skincare logic:

- Correct layering order: cleanser first, then toner/essence, then
  treatments/serums (thinnest to thickest texture), then moisturizer,
  then sunscreen last.
- Sunscreen ("sun protect" category) is morning-only, always the final
  step, never at night.
- Strong actives (retinol, AHA/BHA exfoliants, vitamin C serums) are
  usually night-only or every-other-day, not both sessions daily --
  use your judgment on frequency for these.
- Rich creams/oils/masks are usually evening-only or occasional
  (weekly), not necessarily both sessions.
- Not every product needs to be used both morning AND evening -- assign
  each product to whichever session(s) actually make sense for that
  product type.
- If a product should be used before or after another for best results
  (e.g. don't layer two heavy treatments together), reflect that in the
  order they appear within their session and in the instructions.

Respond with ONLY a JSON object, no markdown, no other text, in this
exact shape:
{{
  "steps": [
    {{
      "product_name": "<exact product name from the list above>",
      "when": "morning" | "evening" | "morning and evening",
      "frequency": "daily" | "2-3x per week" | "as needed",
      "instructions": "<one short sentence: how much to use, application technique, and anything to use before/after this step>"
    }}
  ],
  "note": "<one short sentence on the overall logic of this routine>"
}}

List steps in the order they should actually be applied within each session.
"""

    try:
        parsed = await _call_gemini(prompt)
        if isinstance(parsed.get("steps"), list) and len(parsed["steps"]) > 0:
            valid_names = {p["name"] for p in products}
            # Guard against Gemini inventing or mis-copying a product name --
            # drop any step that doesn't match an actual matched product.
            parsed["steps"] = [s for s in parsed["steps"] if s.get("product_name") in valid_names]
            if parsed["steps"]:
                return parsed
    except Exception as e:
        print(f"Gemini routine generation failed, using fallback: {e}")

    return fallback