from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from app.database import get_db

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
    else:
        questions = await db.fetch(
            "SELECT id, question_text, question_type, options, order_index FROM campaign_questions WHERE campaign_id = $1 ORDER BY order_index",
            campaign["id"]
        )
        result["questions"] = [dict(q) for q in questions]

    return result


class ResponseSubmission(BaseModel):
    user_id: int | None = None
    answers: list[dict] | None = None
    moves_taken: int | None = None
    time_taken_seconds: int | None = None


@router.post("/{slug}/respond")
async def submit_response(slug: str, payload: ResponseSubmission, db=Depends(get_db)):
    campaign = await db.fetchrow("SELECT * FROM campaigns WHERE slug = $1", slug)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign_id = campaign["id"]

    # Guests are never eligible for a reward -- only logged-in users are.
    is_guest = payload.user_id is None

    already_participated = False
    if not is_guest:
        existing = await db.fetchrow(
            "SELECT 1 FROM campaign_participation WHERE campaign_id = $1 AND user_id = $2",
            campaign_id, payload.user_id
        )
        already_participated = existing is not None

    grants_reward = (not is_guest) and (not already_participated)

    if campaign["campaign_type"] == "memory_match":
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

        # Always log the play itself, win/lose, for analytics -- but only
        # record a reward_issued_value when a reward is actually granted.
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
            "already_rewarded": already_participated,
            "requires_login": is_guest
        }

    for ans in payload.answers or []:
        await db.execute(
            "INSERT INTO campaign_responses (campaign_id, user_id, question_id, answer) VALUES ($1, $2, $3, $4)",
            campaign_id, payload.user_id, ans["question_id"], ans["answer"]
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

    return {
        "success": True,
        "reward_type": campaign["reward_type"] if grants_reward else None,
        "reward_value": campaign["reward_value"] if grants_reward else None,
        "already_rewarded": already_participated,
        "requires_login": is_guest
    }