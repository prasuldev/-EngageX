from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.database import get_db
from app.auth.role_guard import require_role
from app.services.ai_insights_service import get_ai_insights
from app.services.ai_sales_intelligence_service import (
    answer_sales_question_flexible,
    get_ai_sales_intelligence,
)
from app.services.segmentation_service import (
    get_skin_type_breakdown,
    get_top_concerns,
    get_skin_type_concern_crosstab,
    get_response_funnel,
)

router = APIRouter(prefix="/api/internal/dashboard", tags=["dashboard"])


class SalesQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=500)

@router.get("/campaign-performance")
async def campaign_performance(
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    rows = await db.fetch(
        """
        SELECT
            c.id, c.title, c.campaign_type, c.is_active, c.start_date, c.end_date,
            COUNT(DISTINCT cp.user_id) AS participants,
            COUNT(DISTINCT cr.id) AS total_responses
        FROM campaigns c
        LEFT JOIN campaign_participation cp ON cp.campaign_id = c.id
        LEFT JOIN campaign_responses cr ON cr.campaign_id = c.id
        GROUP BY c.id
        ORDER BY participants DESC
        """
    )
    return [dict(r) for r in rows]


@router.get("/campaign-overview")
async def campaign_overview(
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    row = await db.fetchrow(
        """
        SELECT
            COUNT(*) FILTER (WHERE is_active = true) AS active_campaigns,
            COUNT(*) FILTER (WHERE is_active = false) AS inactive_campaigns,
            COUNT(*) AS total_campaigns
        FROM campaigns
        """
    )
    return dict(row)


@router.get("/beauty-match-performance")
async def beauty_match_performance(
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    rows = await db.fetch(
        """
        SELECT
            c.id AS campaign_id, c.title,
            COUNT(gs.id) AS total_plays,
            COUNT(*) FILTER (WHERE gs.completed = true) AS completions,
            ROUND(AVG(gs.moves_taken)) AS avg_moves,
            ROUND(AVG(gs.time_taken_seconds)) AS avg_time_seconds
        FROM campaigns c
        JOIN game_sessions gs ON gs.campaign_id = c.id
        WHERE c.campaign_type = 'memory_match'
        GROUP BY c.id
        ORDER BY total_plays DESC
        """
    )
    return [dict(r) for r in rows]


@router.get("/customer-segments")
async def customer_segments(
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    skin_types = await get_skin_type_breakdown(db)
    concerns = await get_top_concerns(db)
    crosstab = await get_skin_type_concern_crosstab(db)
    funnel = await get_response_funnel(db)
    return {
        "skin_type_breakdown": [dict(r) for r in skin_types],
        "top_concerns": [dict(r) for r in concerns],
        "skin_type_concern_crosstab": [dict(r) for r in crosstab],
        "response_funnel": dict(funnel),
    }


@router.get("/ai-insights")
async def ai_insights(
    refresh: bool = False,
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    return await get_ai_insights(db, force_refresh=refresh)


@router.get("/ai-sales-intelligence")
async def ai_sales_intelligence(
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    return await get_ai_sales_intelligence(db)


@router.post("/ai-sales-assistant")
async def ai_sales_assistant(
    payload: SalesQuestion,
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    intelligence = await get_ai_sales_intelligence(db)
    return await answer_sales_question_flexible(payload.question, intelligence)


@router.get("/sales-overview")
async def sales_overview(
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    summary = await db.fetchrow(
        """
        SELECT
            (SELECT COUNT(*)
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE r.name = 'customer') AS total_customers,

            (SELECT COUNT(*)
             FROM orders) AS total_orders,

            (SELECT COALESCE(SUM(total_amount), 0)
             FROM orders) AS revenue,

            (SELECT COUNT(*)
             FROM campaigns
             WHERE is_active = true) AS active_campaigns
        """
    )

    recent_orders = await db.fetch(
        """
        SELECT
            o.id AS order_id,
            u.full_name AS customer,
            o.total_amount AS amount,
            o.status,
            o.created_at AS date
        FROM orders o
        JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 5
        """
    )

    return {
        "total_customers": summary["total_customers"],
        "total_orders": summary["total_orders"],
        "revenue": float(summary["revenue"] or 0),
        "active_campaigns": summary["active_campaigns"],
        "recent_orders": [dict(row) for row in recent_orders],
    }
