class RecommendationService:

    @staticmethod
    async def get_recommendations(
        db,
        user_id: int
    ):

        wishlist_categories = await db.fetch(
            """
            SELECT DISTINCT p.category_id
            FROM wishlists w
            JOIN products p
                ON w.product_id = p.id
            WHERE w.user_id = $1
            """,
            user_id
        )

        order_categories = await db.fetch(
            """
            SELECT DISTINCT p.category_id
            FROM order_items oi
            JOIN orders o
                ON oi.order_id = o.id
            JOIN products p
                ON oi.product_id = p.id
            WHERE o.user_id = $1
            """,
            user_id
        )

        category_ids = set()

        for row in wishlist_categories:
            category_ids.add(row["category_id"])

        for row in order_categories:
            category_ids.add(row["category_id"])

        if not category_ids:

            products = await db.fetch(
                """
                SELECT
                    id,
                    name,
                    price,
                    rating,
                    image_url
                FROM products
                WHERE is_featured = TRUE
                ORDER BY rating DESC
                LIMIT 10
                """
            )

            return {
                "recommendations": [
                    dict(product)
                    for product in products
                ]
            }

        products = await db.fetch(
            """
            SELECT
                id,
                name,
                price,
                rating,
                image_url,
                category_id
            FROM products
            WHERE category_id = ANY($1::int[])
            AND id NOT IN (
                SELECT oi.product_id
                FROM order_items oi
                JOIN orders o
                    ON oi.order_id = o.id
                WHERE o.user_id = $2
            )
            ORDER BY rating DESC
            LIMIT 10
            """,
            list(category_ids),
            user_id
        )

        return {
            "recommendations": [
                dict(product)
                for product in products
            ]
        }