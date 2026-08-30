from app.services.activity_service import ActivityService

class CartService:

    @staticmethod
    async def add_to_cart(
        db,
        user_id: int,
        product_id: int,
        quantity: int
    ):

        await db.execute(
            """
            INSERT INTO cart_items (
                user_id,
                product_id,
                quantity
            )

            VALUES ($1,$2,$3)

            ON CONFLICT (
                user_id,
                product_id
            )

            DO UPDATE SET
                quantity = cart_items.quantity + EXCLUDED.quantity
            """,
            user_id,
            product_id,
            quantity
        )

        await ActivityService.log_activity(
            db,
            user_id,
            product_id,
            "cart_add"
        )

        return {
            "success": True,
            "message": "Added to cart"
        }

    @staticmethod
    async def get_cart(
        db,
        user_id: int
    ):

        rows = await db.fetch(
            """
            SELECT
                p.id,
                p.name,
                p.price,
                p.image_url,
                c.quantity,
                (p.price * c.quantity) AS total

            FROM cart_items c

            JOIN products p
                ON p.id = c.product_id

            WHERE c.user_id = $1

            ORDER BY c.created_at DESC
            """,
            user_id
        )

        return [dict(row) for row in rows]

    @staticmethod
    async def remove_from_cart(
        db,
        user_id: int,
        product_id: int
    ):

        await db.execute(
            """
            DELETE FROM cart_items
            WHERE user_id=$1
            AND product_id=$2
            """,
            user_id,
            product_id
        )

        return {
            "success": True,
            "message": "Removed from cart"
        }

    @staticmethod
    async def update_quantity(db, user_id: int, product_id: int, quantity: int):
        result = await db.execute(
            """
            UPDATE cart_items
            SET quantity = $1
            WHERE user_id = $2 AND product_id = $3
            """,
            quantity, user_id, product_id
        )
        if result == "UPDATE 0":
            return None
        return {"success": True, "message": "Quantity updated"}

    