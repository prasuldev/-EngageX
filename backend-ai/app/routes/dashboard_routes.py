from fastapi import APIRouter, Depends
from app.database import get_db
from app.auth.role_guard import require_role

router = APIRouter(prefix="/api/internal/dashboard", tags=["dashboard"])

@router.get("/campaign-performance")
async def campaign_performance(
    db=Depends(get_db),
    current_user=Depends(require_role(["admin", "marketing_manager"]))
):
    rows = await db.fetch(
        """
        SELECT
            c.id,
            c.title,
            c.campaign_type,
            c.is_active,
            c.start_date,
            c.end_date,
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
            c.id AS campaign_id,
            c.title,
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