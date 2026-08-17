from app.services.activity_service import ActivityService

class WishlistService:

    @staticmethod
    async def add_to_wishlist(
        db,
        user_id: int,
        product_id: int
    ):

        await db.execute(
            """
            INSERT INTO wishlists (
                user_id,
                product_id
            )

            VALUES ($1, $2)
            ON CONFLICT (
                user_id,
                product_id
            )
            DO NOTHING
            """,
            user_id,
            product_id
        )
        await ActivityService.log_activity(
            db,
            user_id,
            product_id,
            "wishlist_add"
        )

        return {
            "success": True,
            "message": "Added to wishlist"
        }

    @staticmethod
    async def get_wishlist(
        db,
        user_id: int
    ):

        rows = await db.fetch(
            """
            SELECT
                p.id,
                p.name,
                p.price,
                p.rating,
                p.image_url,
                b.name AS brand,
                c.name AS category

            FROM wishlists w

            JOIN products p
                ON w.product_id = p.id

            LEFT JOIN brands b
                ON p.brand_id = b.id

            LEFT JOIN categories c
                ON p.category_id = c.id

            WHERE w.user_id = $1

            ORDER BY w.created_at DESC
            """,
            user_id
        )

        return [dict(row) for row in rows]

    @staticmethod
    async def remove_from_wishlist(
        db,
        user_id: int,
        product_id: int
    ):

        await db.execute(
            """
            DELETE FROM wishlists
            WHERE user_id = $1
            AND product_id = $2
            """,
            user_id,
            product_id
        )

        return {
            "success": True,
            "message": "Removed from wishlist"
        }

    