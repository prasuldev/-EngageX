from app.services.activity_service import ActivityService

class ReviewService:

    @staticmethod
    async def add_review(db, user_id: int, order_id: int, product_id: int, rating: int, reasons: list[str]):
        order = await db.fetchrow(
            "SELECT status FROM orders WHERE id = $1 AND user_id = $2",
            order_id, user_id
        )
        if not order:
            return {"success": False, "message": "Order not found"}

        if order["status"] != "Delivered":
            return {"success": False, "message": "You can only rate products after delivery"}

        item = await db.fetchrow(
            "SELECT 1 FROM order_items WHERE order_id = $1 AND product_id = $2",
            order_id, product_id
        )
        if not item:
            return {"success": False, "message": "This product is not part of this order"}

        existing = await db.fetchval(
            "SELECT 1 FROM reviews WHERE order_id = $1 AND product_id = $2 AND user_id = $3",
            order_id, product_id, user_id
        )
        if existing:
            return {"success": False, "message": "You have already rated this product for this order"}

        await db.execute(
            """
            INSERT INTO reviews (user_id, product_id, order_id, rating, reasons)
            VALUES ($1, $2, $3, $4, $5)
            """,
            user_id, product_id, order_id, rating, reasons
        )

        await ActivityService.log_activity(db, user_id, product_id, "review")

        avg_rating = await db.fetchval(
            "SELECT AVG(rating) FROM reviews WHERE product_id = $1",
            product_id
        )
        await db.execute(
            "UPDATE products SET rating = $1 WHERE id = $2",
            round(float(avg_rating), 1), product_id
        )

        return {"success": True, "message": "Rating submitted"}

    @staticmethod
    async def get_product_reviews(db, product_id: int):
        rows = await db.fetch(
            """
            SELECT r.id, r.rating, r.reasons, r.created_at, u.full_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = $1
            ORDER BY r.created_at DESC
            """,
            product_id
        )
        return [dict(row) for row in rows]