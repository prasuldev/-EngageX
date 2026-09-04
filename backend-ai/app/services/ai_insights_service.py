"""
AI-generated narrative insights for the internal dashboard.

Pulls a compact summary of campaign performance, Beauty Match stats, and
customer segmentation data, then asks Gemini to surface 2-3 short,
specific observations a marketing manager would actually find useful --
not a restatement of numbers already visible on the dashboard.

Cached in-memory with a TTL (not per-key like the quiz questions, since
this should refresh periodically rather than once per unique input).
Any Gemini failure falls back to a simple rule-based summary so the
dashboard section never breaks.
"""

import json
import os
import time
import asyncio
import httpx
from app.config import GEMINI_MODEL

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY_INSIGHTS") or os.getenv("GEMINI_API_KEY")

GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
)

INSIGHTS_TTL_SECONDS = 60 * 60  # 1 hour

_insights_cache: dict = {"insights": None, "generated_at": None}


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


async def _gather_dashboard_summary(db) -> dict:
    """
    Pulls compact, already-aggregated numbers -- not raw rows -- to keep
    the prompt short and cheap. Mirrors the same queries used by the
    dashboard's own endpoints, but only selects what's needed for a
    narrative summary.
    """
    campaign_overview = await db.fetchrow(
        """
        SELECT
            COUNT(*) FILTER (WHERE is_active = true) AS active_campaigns,
            COUNT(*) FILTER (WHERE is_active = false) AS inactive_campaigns,
            COUNT(*) AS total_campaigns
        FROM campaigns
        """
    )

    campaign_performance = await db.fetch(
        """
        SELECT
            c.title,
            c.campaign_type,
            COUNT(DISTINCT cp.user_id) AS participants,
            COUNT(DISTINCT cr.id) AS total_responses
        FROM campaigns c
        LEFT JOIN campaign_participation cp ON cp.campaign_id = c.id
        LEFT JOIN campaign_responses cr ON cr.campaign_id = c.id
        WHERE c.is_active = true
        GROUP BY c.id
        ORDER BY participants DESC
        """
    )

    beauty_match = await db.fetch(
        """
        SELECT
            COUNT(gs.id) AS total_plays,
            COUNT(*) FILTER (WHERE gs.completed = true) AS completions,
            ROUND(AVG(gs.moves_taken)) AS avg_moves,
            ROUND(AVG(gs.time_taken_seconds)) AS avg_time_seconds
        FROM campaigns c
        JOIN game_sessions gs ON gs.campaign_id = c.id
        WHERE c.campaign_type = 'memory_match'
        """
    )

    skin_types = await db.fetch(
        """
        SELECT sp.skin_type,
               COUNT(*) AS response_count,
               COUNT(DISTINCT qr.user_id) AS unique_users
        FROM quiz_responses qr
        JOIN skin_profiles sp ON sp.profile_hash = qr.profile_hash
        GROUP BY sp.skin_type
        ORDER BY response_count DESC
        """
    )

    top_concerns = await db.fetch(
        """
        SELECT concern, COUNT(*) AS count
        FROM quiz_responses qr
        JOIN skin_profiles sp ON sp.profile_hash = qr.profile_hash
        CROSS JOIN LATERAL unnest(sp.concerns) AS concern
        GROUP BY concern
        ORDER BY count DESC
        LIMIT 5
        """
    )

    return {
        "campaign_overview": dict(campaign_overview),
        "campaign_performance": [dict(r) for r in campaign_performance],
        "beauty_match": dict(beauty_match[0]) if beauty_match else {},
        "skin_type_breakdown": [dict(r) for r in skin_types],
        "top_concerns": [dict(r) for r in top_concerns],
    }


def _build_insights_prompt(summary: dict) -> str:
    return f"""You are a marketing analyst reviewing dashboard data for a
cosmetics e-commerce platform's interactive campaigns (polls, quizzes,
games, mood check-ins).

Here is the current data summary:
{json.dumps(summary, default=str, indent=2)}

Write 2-3 short, specific observations a marketing manager would find
genuinely useful -- not a restatement of the numbers themselves. Focus on
patterns, risks, or opportunities (e.g. low sample sizes to be cautious
about, a campaign type outperforming others, a segment worth targeting).
Each observation should be one sentence, under 30 words.

Respond with ONLY a JSON object, no markdown, no other text:
{{"insights": ["<observation 1>", "<observation 2>", "<observation 3>"]}}
"""


def _fallback_insights(summary: dict) -> list[str]:
    """
    Simple rule-based fallback so the section never comes up empty if
    Gemini is unavailable or over quota.
    """
    insights = []

    perf = summary.get("campaign_performance", [])
    if perf:
        top = max(perf, key=lambda c: c["participants"])
        insights.append(
            f"\"{top['title']}\" has the most participants ({top['participants']}) among active campaigns."
        )

    concerns = summary.get("top_concerns", [])
    if concerns:
        top_concern = concerns[0]
        insights.append(
            f"\"{top_concern['concern']}\" is the most common skin concern reported ({top_concern['count']} mentions)."
        )

    funnel_users = {r["unique_users"] for r in summary.get("skin_type_breakdown", [])}
    if funnel_users and max(funnel_users, default=0) <= 2:
        insights.append(
            "Skin quiz data comes from a very small number of unique users -- treat segment conclusions cautiously."
        )

    return insights or ["Not enough data yet to generate insights."]


async def get_ai_insights(db, force_refresh: bool = False) -> dict:
    now = time.time()

    if (
        not force_refresh
        and _insights_cache["insights"] is not None
        and _insights_cache["generated_at"] is not None
        and now - _insights_cache["generated_at"] < INSIGHTS_TTL_SECONDS
    ):
        return {
            "insights": _insights_cache["insights"],
            "generated_at": _insights_cache["generated_at"],
            "cached": True,
        }

    summary = await _gather_dashboard_summary(db)

    if not GEMINI_API_KEY:
        insights = _fallback_insights(summary)
    else:
        prompt = _build_insights_prompt(summary)
        try:
            parsed = await _call_gemini(prompt)
            insights = parsed.get("insights")
            if not isinstance(insights, list) or not insights:
                insights = _fallback_insights(summary)
        except Exception as e:
            print(f"Gemini insights generation failed, using fallback: {e}")
            insights = _fallback_insights(summary)

    _insights_cache["insights"] = insights
    _insights_cache["generated_at"] = now

    return {
        "insights": insights,
        "generated_at": now,
        "cached": False,
    }