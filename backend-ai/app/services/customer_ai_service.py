from collections import defaultdict
from datetime import datetime, timezone


class CustomerAIService:
    """Grounded, customer-specific shopping intelligence built from EngageX data."""

    @staticmethod
    async def build_home_feed(db, user_id: int):
        products = await db.fetch(
            """
            WITH preferred_categories AS (
                SELECT DISTINCT p.category_id
                FROM products p
                LEFT JOIN wishlists w ON w.product_id = p.id AND w.user_id = $1
                LEFT JOIN order_items oi ON oi.product_id = p.id
                LEFT JOIN orders o ON o.id = oi.order_id AND o.user_id = $1
                WHERE w.id IS NOT NULL OR o.id IS NOT NULL
            )
            SELECT p.id, p.name, p.price, p.rating, p.image_url,
                   c.name AS category, b.name AS brand,
                   EXISTS (
                       SELECT 1 FROM preferred_categories pc
                       WHERE pc.category_id = p.category_id
                   ) AS preference_match,
                   COALESCE(AVG(r.rating), p.rating, 0) AS review_rating,
                   COUNT(r.id) AS review_count
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN brands b ON b.id = p.brand_id
            LEFT JOIN reviews r ON r.product_id = p.id
            WHERE NOT EXISTS (
                SELECT 1 FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.user_id = $1 AND oi.product_id = p.id
            )
            GROUP BY p.id, c.name, b.name
            ORDER BY preference_match DESC, p.rating DESC NULLS LAST
            LIMIT 8
            """,
            user_id,
        )

        purchases = await db.fetch(
            """
            SELECT p.id, p.name, p.image_url, c.name AS category,
                   MAX(o.created_at) AS last_ordered,
                   COUNT(DISTINCT o.id) AS order_count,
                   COALESCE(AVG(oi.price), p.price) AS price
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            JOIN products p ON p.id = oi.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE o.user_id = $1
            GROUP BY p.id, c.name
            ORDER BY last_ordered DESC
            LIMIT 8
            """,
            user_id,
        )

        campaigns = await db.fetch(
            """
            SELECT title, description, reward_type, reward_value, slug, end_date
            FROM campaigns
            WHERE is_active = TRUE
              AND (start_date IS NULL OR start_date <= NOW())
              AND (end_date IS NULL OR end_date >= NOW())
              AND COALESCE(reward_type, 'none') <> 'none'
            ORDER BY end_date ASC NULLS LAST
            LIMIT 3
            """
        )

        profile = await db.fetchrow(
            """
            SELECT sp.skin_type, sp.concerns, sp.ai_blurb
            FROM quiz_responses qr
            JOIN skin_profiles sp ON sp.profile_hash = qr.profile_hash
            WHERE qr.user_id = $1
            ORDER BY qr.created_at DESC
            LIMIT 1
            """,
            user_id,
        )

        now = datetime.now(timezone.utc)
        reminders = []
        for row in purchases[:4]:
            ordered = row["last_ordered"]
            if ordered and ordered.tzinfo is None:
                ordered = ordered.replace(tzinfo=timezone.utc)
            days = max(0, (now - ordered).days) if ordered else 0
            interval = 60 if (row["category"] or "").lower() in {"serum", "skincare"} else 45
            reminders.append({
                "product_id": row["id"], "name": row["name"], "image_url": row["image_url"],
                "days_since_purchase": days, "estimated_interval_days": interval,
                "status": "Due soon" if days >= interval - 7 else f"About {interval - days} days remaining",
            })

        feed = []
        for row in products:
            rating = float(row["review_rating"] or 0)
            reason = "Matches categories you have saved or purchased" if row["preference_match"] else "Highly rated by EngageX customers"
            feed.append({
                "id": row["id"], "name": row["name"], "price": float(row["price"]),
                "rating": float(row["rating"] or 0), "image_url": row["image_url"],
                "category": row["category"], "brand": row["brand"], "why": reason,
                "review_insight": f"{rating:.1f}/5 from {row['review_count']} review(s)" if row["review_count"] else "Not enough reviews yet",
                "sentiment": "Loved" if rating >= 4 else "Positive" if rating >= 3 else "New",
            })

        bundles = []
        for bought, suggested in zip(purchases[:3], feed[:3]):
            bundles.append({
                "title": f"Pair with {bought['name']}", "anchor": bought["name"],
                "product": suggested, "why": f"Complements your recent {bought['category'] or 'beauty'} purchase",
            })

        routines = []
        for index, item in enumerate(purchases[:3], start=1):
            routines.append({
                "step": index, "product": item["name"],
                "guidance": "Use consistently as directed on the product label; patch test before combining new products.",
            })

        compatibility = {
            "available": bool(profile),
            "skin_type": profile["skin_type"] if profile else None,
            "concerns": list(profile["concerns"] or []) if profile else [],
            "summary": profile["ai_blurb"] if profile else "Complete Skin Twin to unlock skin compatibility matches.",
            "shade_matching": {"available": False, "reason": "Shade matching needs verified shade and undertone catalog data."},
        }

        return {
            "personalized_feed": feed,
            "replenishment_reminders": reminders,
            "bundles": bundles,
            "routine_coaching": routines,
            "offers": [dict(row) for row in campaigns],
            "compatibility": compatibility,
        }
