class OrderService:

    @staticmethod
    async def place_order(
        db,
        user_id: int,
        address_id: int
    ):

        # Get cart items
        cart_items = await db.fetch(
            """
            SELECT
                c.product_id,
                c.quantity,
                p.price

            FROM cart_items c

            JOIN products p
                ON p.id = c.product_id

            WHERE c.user_id = $1
            """,
            user_id
        )

        # Check empty cart
        if not cart_items:
            return {
                "success": False,
                "message": "Cart is empty"
            }

        # Calculate total
        total_amount = sum(
            item["price"] * item["quantity"]
            for item in cart_items
        )

        # Create order
        order = await db.fetchrow(
            """
            INSERT INTO orders (
                user_id,
                address_id,
                total_amount,
                status
            )
            VALUES ($1, $2, $3, 'Pending')
            RETURNING id
            """,
            user_id,
            address_id,
            total_amount
        )

        order_id = order["id"]

        # Create order items
        for item in cart_items:
            await db.execute(
                """
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    quantity,
                    price
                )
                VALUES ($1, $2, $3, $4)
                """,
                order_id,
                item["product_id"],
                item["quantity"],
                item["price"]
            )

        # Clear cart
        await db.execute(
            """
            DELETE FROM cart_items
            WHERE user_id = $1
            """,
            user_id
        )

        return {
            "success": True,
            "order_id": order_id,
            "total_amount": float(total_amount),
            "status": "Pending"
        }

    @staticmethod
    async def get_orders(
        db,
        user_id: int
    ):

        rows = await db.fetch(
            """
            SELECT
                id,
                total_amount,
                status,
                created_at

            FROM orders

            WHERE user_id = $1

            ORDER BY created_at DESC
            """,
            user_id
        )

        return [dict(row) for row in rows]

    @staticmethod
    async def get_order_details(
        db,
        user_id: int,
        order_id: int
    ):

        order = await db.fetchrow(
            """
            SELECT
                o.id,
                o.total_amount,
                o.status,
                o.created_at,

                a.full_name,
                a.phone,
                a.address_line1,
                a.address_line2,
                a.city,
                a.state,
                a.pincode

            FROM orders o

            LEFT JOIN addresses a
                ON o.address_id = a.id

            WHERE o.id = $1
            AND o.user_id = $2
            """,
            order_id,
            user_id
        )

        if not order:
            return {
                "success": False,
                "message": "Order not found"
            }

        items = await db.fetch(
            """
            SELECT
                p.name,
                oi.quantity,
                oi.price,
                (oi.quantity * oi.price) AS subtotal

            FROM order_items oi

            JOIN products p
                ON p.id = oi.product_id

            WHERE oi.order_id = $1
            """,
            order_id
        )

        return {
            "order": dict(order),
            "items": [dict(item) for item in items]
        }

    @staticmethod
    async def get_order_details(
        db,
        user_id: int,
        order_id: int
    ):

        order = await db.fetchrow(
            """
            SELECT
                o.id,
                o.total_amount,
                o.status,
                o.created_at,

                a.full_name,
                a.phone,
                a.address_line1,
                a.address_line2,
                a.city,
                a.state,
                a.pincode,
                a.country

            FROM orders o

            LEFT JOIN addresses a
                ON o.address_id = a.id

            WHERE o.id = $1
            AND o.user_id = $2
            """,
            order_id,
            user_id
        )

        if not order:
            return {
                "success": False,
                "message": "Order not found"
            }

        items = await db.fetch(
            """
            SELECT
                p.id,
                p.name,
                p.image_url,

                oi.quantity,
                oi.price,

                (oi.quantity * oi.price) AS subtotal

            FROM order_items oi

            JOIN products p
                ON p.id = oi.product_id

            WHERE oi.order_id = $1
            """,
            order_id
        )

        return {
            "success": True,
            "order": dict(order),
            "items": [dict(item) for item in items]
        }