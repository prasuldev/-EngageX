class ProfileService:

    @staticmethod
    async def get_profile_dashboard(
        db,
        user_id: int
    ):

        # User info
        user = await db.fetchrow(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                created_at
            FROM users
            WHERE id = $1
            """,
            user_id
        )

        if not user:
            return {
                "success": False,
                "message": "User not found"
            }

        # Statistics
        order_count = await db.fetchval(
            """
            SELECT COUNT(*)
            FROM orders
            WHERE user_id = $1
            """,
            user_id
        )

        wishlist_count = await db.fetchval(
            """
            SELECT COUNT(*)
            FROM wishlists
            WHERE user_id = $1
            """,
            user_id
        )

        review_count = await db.fetchval(
            """
            SELECT COUNT(*)
            FROM reviews
            WHERE user_id = $1
            """,
            user_id
        )

        # Recent Orders
        recent_orders = await db.fetch(
            """
            SELECT
                id,
                total_amount,
                status,
                created_at
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 5
            """,
            user_id
        )

        # Recent Reviews
        recent_reviews = await db.fetch(
            """
            SELECT
                r.rating,
                r.review,
                r.created_at,
                p.name AS product_name
            FROM reviews r
            JOIN products p
                ON r.product_id = p.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            LIMIT 5
            """,
            user_id
        )

        return {
            "success": True,
            "user": dict(user),
            "stats": {
                "orders": order_count,
                "wishlist": wishlist_count,
                "reviews": review_count
            },
            "recent_orders": [dict(x) for x in recent_orders],
            "recent_reviews": [dict(x) for x in recent_reviews]
        }