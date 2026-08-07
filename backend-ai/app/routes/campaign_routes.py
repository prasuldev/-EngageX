import hashlib
import json
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.ai_recommender import get_ai_recommendation, generate_category_questions, generate_skin_blurb, generate_skin_routine
from app.services.mood_ritual_resolver import resolve_product_for_category
from app.services.mood_ritual_ai import generate_mood_captions
from app.routes.dashboard_ws import manager

router = APIRouter(
    prefix="/campaigns",
    tags=["Campaigns"]
)

@router.get("/active")
async def get_active_campaigns(
    context: str = Query("global"),
    db=Depends(get_db)
):
    rows = await db.fetch(
        """
        SELECT id, title, description, campaign_type, reward_type, reward_value, slug
        FROM campaigns
        WHERE is_active = true
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
          AND (target_context = 'global' OR target_context = $1)
        ORDER BY created_at DESC
        """,
        context
    )
    return [dict(r) for r in rows]


@router.get("/{slug}")
async def get_campaign_detail(slug: str, db=Depends(get_db)):
    campaign = await db.fetchrow(
        "SELECT * FROM campaigns WHERE slug = $1 AND is_active = true",
        slug
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    result = dict(campaign)

    if campaign["campaign_type"] == "memory_match":
        card_set = await db.fetchrow(
            "SELECT id, mode, pair_count FROM game_card_sets WHERE campaign_id = $1",
            campaign["id"]
        )
        if card_set:
            pairs = await db.fetch(
                """
                SELECT id, card_a_label, card_a_type, card_b_label, product_id
                FROM game_card_pairs
                WHERE card_set_id = $1
                ORDER BY display_order
                """,
                card_set["id"]
            )
            result["card_set"] = dict(card_set)
            result["card_pairs"] = [dict(p) for p in pairs]

    
    elif campaign["campaign_type"] == "mood_ritual":
        moods = await db.fetch(
            "SELECT slug, label, subtext, emoji FROM mood_ritual_moods WHERE active = true ORDER BY id"
        )
        result["moods"] = [dict(m) for m in moods]

    else:
        questions = await db.fetch(
            "SELECT id, question_text, question_type, options, order_index FROM campaign_questions WHERE campaign_id = $1 ORDER BY order_index",
            campaign["id"]
        )
        result["questions"] = [dict(q) for q in questions]

    return result


@router.get("/{slug}/category-questions")
async def get_category_questions(
    slug: str,
    category: str = Query(...),
    db=Depends(get_db)
):
    """
    Returns 2 AI-generated, category-specific multiple-choice questions
    for the poll's step 2 and 3, based on whichever category the user
    picked at step 1.
    """
    campaign = await db.fetchrow(
        "SELECT id FROM campaigns WHERE slug = $1 AND is_active = true", slug
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return await generate_category_questions(category)


class ResponseSubmission(BaseModel):
    user_id: int | None = None
    answers: list[dict] | None = None
    moves_taken: int | None = None
    time_taken_seconds: int | None = None
    mood_slug: str | None = None


@router.post("/{slug}/respond")
async def submit_response(slug: str, payload: ResponseSubmission, db=Depends(get_db)):
    campaign = await db.fetchrow("SELECT * FROM campaigns WHERE slug = $1", slug)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Only logged-in users may participate in campaigns at all -- the
    # frontend already blocks guests from opening a campaign, but this is
    # enforced here too as the real source of truth.
    if payload.user_id is None:
        raise HTTPException(status_code=401, detail="You must be logged in to participate in campaigns")

    campaign_id = campaign["id"]

    if campaign["campaign_type"] == "memory_match":
        # One reward ever, per user, per campaign -- but every attempt
        # (win or lose) still gets logged in game_sessions below,
        # regardless of whether it earns a reward.
        existing = await db.fetchrow(
            "SELECT 1 FROM campaign_participation WHERE campaign_id = $1 AND user_id = $2",
            campaign_id, payload.user_id
        )
        already_participated = existing is not None
        grants_reward = not already_participated

        if payload.moves_taken is None or payload.time_taken_seconds is None:
            raise HTTPException(status_code=400, detail="moves_taken and time_taken_seconds required")

        card_set = await db.fetchrow(
            "SELECT id FROM game_card_sets WHERE campaign_id = $1", campaign_id
        )
        if not card_set:
            raise HTTPException(status_code=404, detail="Game config not found for this campaign")

        rules = await db.fetch(
            "SELECT * FROM game_reward_rules WHERE card_set_id = $1 ORDER BY priority DESC",
            card_set["id"]
        )

        matched_rule = None
        for rule in rules:
            if rule["rule_type"] == "under_par_moves" and payload.moves_taken <= rule["threshold_value"]:
                matched_rule = rule
                break
            elif rule["rule_type"] == "under_time" and payload.time_taken_seconds <= rule["threshold_value"]:
                matched_rule = rule
                break
            elif rule["rule_type"] == "completion":
                matched_rule = rule
                break

        reward_type = matched_rule["reward_type"] if matched_rule else campaign["reward_type"]
        reward_value = matched_rule["reward_value"] if matched_rule else campaign["reward_value"]

        await db.execute(
            """
            INSERT INTO game_sessions
                (campaign_id, user_id, moves_taken, time_taken_seconds, completed, reward_rule_id, reward_issued_value)
            VALUES ($1, $2, $3, $4, true, $5, $6)
            """,
            campaign_id, payload.user_id, payload.moves_taken, payload.time_taken_seconds,
            matched_rule["id"] if matched_rule else None,
            reward_value if grants_reward else None
        )

        if grants_reward:
            await db.execute(
                """
                INSERT INTO campaign_participation (campaign_id, user_id)
                VALUES ($1, $2)
                ON CONFLICT (campaign_id, user_id) DO NOTHING
                """,
                campaign_id, payload.user_id
            )

            await manager.broadcast({"event": "participation_update", "campaign_id": campaign_id})

            today = await db.fetchval("SELECT CURRENT_DATE")
            streak = await db.fetchrow(
                "SELECT * FROM user_game_streaks WHERE user_id = $1", payload.user_id
            )
            if streak is None:
                await db.execute(
                    """
                    INSERT INTO user_game_streaks (user_id, current_streak, longest_streak, last_played_date)
                    VALUES ($1, 1, 1, $2)
                    """,
                    payload.user_id, today
                )
            else:
                gap = (today - streak["last_played_date"]).days if streak["last_played_date"] else None
                new_streak = streak["current_streak"] + 1 if gap == 1 else 1
                longest = max(new_streak, streak["longest_streak"])
                await db.execute(
                    """
                    UPDATE user_game_streaks
                    SET current_streak = $1, longest_streak = $2, last_played_date = $3, updated_at = NOW()
                    WHERE user_id = $4
                    """,
                    new_streak, longest, today, payload.user_id
                )

        return {
            "success": True,
            "reward_type": reward_type if grants_reward else None,
            "reward_value": reward_value if grants_reward else None,
            "already_rewarded": already_participated
        }

    elif campaign["campaign_type"] == "skin_twin":
        if not payload.answers or len(payload.answers) < 2:
            raise HTTPException(status_code=400, detail="skin_type and concerns answers required")

        skin_type = payload.answers[0].get("answer")
        concerns_raw = payload.answers[1].get("answer")
        concerns = concerns_raw.split(",") if isinstance(concerns_raw, str) else concerns_raw

        if not skin_type or not concerns:
            raise HTTPException(status_code=400, detail="skin_type and concerns required")

        for a in payload.answers:
            if a.get("question_id") is not None:
                await db.execute(
                    "INSERT INTO campaign_responses (campaign_id, user_id, question_id, answer) VALUES ($1, $2, $3, $4)",
                    campaign_id, payload.user_id, a["question_id"], str(a["answer"])
                )

        profile_hash = hashlib.sha256(
            f"{skin_type}:{','.join(sorted(concerns))}".encode()
        ).hexdigest()

        products = await db.fetch(
            """
            SELECT p.id, p.name, p.price, p.rating, p.image_url,
                   b.name AS brand_name, c.name AS category_name
            FROM products p
            JOIN product_tags pt ON pt.product_id = p.id
            JOIN brands b ON b.id = p.brand_id
            JOIN categories c ON c.id = p.category_id
            WHERE $1 = ANY(pt.skin_types)
              AND pt.concerns && $2::text[]
            ORDER BY p.rating DESC
            LIMIT 5
            """,
            skin_type, concerns
        )

        cached = await db.fetchrow(
            "SELECT ai_blurb FROM skin_profiles WHERE profile_hash = $1", profile_hash
        )
        if cached and cached["ai_blurb"]:
            blurb = cached["ai_blurb"]
        else:
            blurb = await generate_skin_blurb(skin_type, concerns)
            await db.execute(
                """
                INSERT INTO skin_profiles (profile_hash, skin_type, concerns, ai_blurb)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (profile_hash) DO UPDATE SET ai_blurb = $4
                """,
                profile_hash, skin_type, concerns, blurb
            )

        await db.execute(
            """
            INSERT INTO quiz_responses (user_id, campaign_id, answers, profile_hash)
            VALUES ($1, $2, $3, $4)
            """,
            payload.user_id, campaign_id, json.dumps(payload.answers), profile_hash
        )

        await db.execute(
            """
            INSERT INTO campaign_participation (campaign_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (campaign_id, user_id) DO NOTHING
            """,
            campaign_id, payload.user_id
        )

        await manager.broadcast({"event": "participation_update", "campaign_id": campaign_id})

        cached_routine = await db.fetchrow(
            "SELECT routine_json FROM skin_profiles WHERE profile_hash = $1", profile_hash
        )
        if cached_routine and cached_routine["routine_json"]:
            routine = json.loads(cached_routine["routine_json"]) if isinstance(cached_routine["routine_json"], str) else cached_routine["routine_json"]
        else:
            routine = await generate_skin_routine(skin_type, concerns, [dict(p) for p in products])
            await db.execute(
                "UPDATE skin_profiles SET routine_json = $1 WHERE profile_hash = $2",
                json.dumps(routine), profile_hash
            )

        return {
            "success": True,
            "blurb": blurb,
            "routine": routine,
            "products": [dict(p) for p in products],
            "low_match": len(products) < 3
        }

    elif campaign["campaign_type"] == "mood_ritual":
        if not payload.mood_slug:
            raise HTTPException(status_code=400, detail="mood_slug required")

        mood = await db.fetchrow(
            "SELECT * FROM mood_ritual_moods WHERE slug = $1 AND active = true",
            payload.mood_slug
        )
        if not mood:
            raise HTTPException(status_code=404, detail="Mood not found")

        # Resolve one real product per relevant category
        category_rows = await db.fetch(
            "SELECT id, name FROM categories WHERE id = ANY($1::int[])",
            mood["relevant_categories"]
        )
        category_names = {c["id"]: c["name"] for c in category_rows}

        resolved = {}
        for cat_id in mood["relevant_categories"]:
            product = await resolve_product_for_category(db, cat_id)
            if product:
                resolved[category_names[cat_id]] = product

        if not resolved:
            raise HTTPException(status_code=404, detail="No products available for this mood")

        # AI captions, keyed by category name
        products_for_ai = {cat: p["name"] for cat, p in resolved.items()}
        captions = await generate_mood_captions(mood["label"], products_for_ai)

        # Build the routine payload the frontend will render
        routine = [
            {
                "category": cat,
                "product": product,
                "caption": captions.get(cat, "")
            }
            for cat, product in resolved.items()
        ]

        # Save check-in (upsert — allows re-checking-in same day if mood changes)
        await db.execute(
            """
            INSERT INTO mood_ritual_checkins (user_id, campaign_id, mood_slug, resolved_products)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, campaign_id, checkin_date)
            DO UPDATE SET mood_slug = $3, resolved_products = $4
            """,
            payload.user_id, campaign_id, payload.mood_slug, json.dumps(resolved, default=str)
        )

        await db.execute(
            """
            INSERT INTO campaign_participation (campaign_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (campaign_id, user_id) DO NOTHING
            """,
            campaign_id, payload.user_id
        )

        await manager.broadcast({"event": "participation_update", "campaign_id": campaign_id})

        # Streak logic — reusing the exact same user_game_streaks table
        # and logic as memory_match, since streaks aren't game-specific
        today = await db.fetchval("SELECT CURRENT_DATE")
        streak = await db.fetchrow(
            "SELECT * FROM user_game_streaks WHERE user_id = $1", payload.user_id
        )
        if streak is None:
            await db.execute(
                """
                INSERT INTO user_game_streaks (user_id, current_streak, longest_streak, last_played_date)
                VALUES ($1, 1, 1, $2)
                """,
                payload.user_id, today
            )
            current_streak = 1
        else:
            gap = (today - streak["last_played_date"]).days if streak["last_played_date"] else None
            new_streak = streak["current_streak"] + 1 if gap == 1 else (streak["current_streak"] if gap == 0 else 1)
            longest = max(new_streak, streak["longest_streak"])
            await db.execute(
                """
                UPDATE user_game_streaks
                SET current_streak = $1, longest_streak = $2, last_played_date = $3, updated_at = NOW()
                WHERE user_id = $4
                """,
                new_streak, longest, today, payload.user_id
            )
            current_streak = new_streak

        return {
            "success": True,
            "mood": {"slug": mood["slug"], "label": mood["label"]},
            "routine": routine,
            "streak": current_streak
        }

    # --- Poll / quiz campaigns ---
    # Step 1's answer is the category (backed by a real question_id).
    # Steps 2-3 are AI-generated on the fly and aren't DB rows, so they're
    # passed straight through to the AI as Q&A context, not logged here.

    if not payload.answers:
        raise HTTPException(status_code=400, detail="answers required")

    category = payload.answers[0].get("answer")

    first_answer = payload.answers[0]
    if first_answer.get("question_id") is not None:
        await db.execute(
            "INSERT INTO campaign_responses (campaign_id, user_id, question_id, answer) VALUES ($1, $2, $3, $4)",
            campaign_id, payload.user_id, first_answer["question_id"], first_answer["answer"]
        )

        await db.execute(
            """
            INSERT INTO campaign_participation (campaign_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (campaign_id, user_id) DO NOTHING
            """,
            campaign_id, payload.user_id
        )

        await manager.broadcast({"event": "participation_update", "campaign_id": campaign_id})

    qa_pairs = [
        {"question": a.get("question_text", ""), "answer": a.get("answer", "")}
        for a in payload.answers[1:]
    ]

    recommendation = await get_ai_recommendation(db, category, qa_pairs)

    return {
        "success": True,
        "recommended_product": recommendation["product"] if recommendation else None,
        "recommendation_reason": recommendation["reason"] if recommendation else None,
        "ai_generated": recommendation["ai_generated"] if recommendation else False
    }