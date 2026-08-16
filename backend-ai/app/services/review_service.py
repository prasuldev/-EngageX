class ReviewService:

    @staticmethod
    async def add_review(
        db,
        user_id: int,
        product_id: int,
        rating: int,
        review: str
    ):

        # Check if product was purchased
        purchase = await db.fetchrow(
            """
            SELECT 1

            FROM order_items oi

            JOIN orders o
                ON oi.order_id = o.id

            WHERE o.user_id = $1
            AND oi.product_id = $2

            LIMIT 1
            """,
            user_id,
            product_id
        )

        if not purchase:
            return {
                "success": False,
                "message": "Purchase required before review"
            }

        # Insert review
        await db.execute(
            """
            INSERT INTO reviews (
                user_id,
                product_id,
                rating,
                review
            )
            VALUES ($1, $2, $3, $4)
            """,
            user_id,
            product_id,
            rating,
            review
        )

        # Calculate average rating
        avg_rating = await db.fetchval(
            """
            SELECT AVG(rating)
            FROM reviews
            WHERE product_id = $1
            """,
            product_id
        )

        # Update product rating
        await db.execute(
            """
            UPDATE products
            SET rating = $1
            WHERE id = $2
            """,
            round(float(avg_rating), 1),
            product_id
        )

        return {
            "success": True,
            "message": "Review submitted"
        }

    @staticmethod
    async def get_product_reviews(
        db,
        product_id: int
    ):

        rows = await db.fetch(
            """
            SELECT
                r.id,
                r.rating,
                r.review,
                r.created_at,
                u.full_name

            FROM reviews r

            JOIN users u
                ON r.user_id = u.id

            WHERE r.product_id = $1

            ORDER BY r.created_at DESC
            """,
            product_id
        )

        return [dict(row) for row in rows]