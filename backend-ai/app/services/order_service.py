from decimal import Decimal
from datetime import datetime, timedelta
from app.services.activity_service import ActivityService

RETURN_WINDOW_DAYS = 7


def add_working_days(start_date, days: int):
    current = start_date
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:  # Mon-Fri
            added += 1
    return current


class OrderService:

    COD_CHARGE = Decimal("30.00")
    PLATFORM_FEE = Decimal("12.00")
    CANCELLABLE_STATUSES = ("Pending", "Confirmed")
    RETURN_WINDOW_DAYS = 7

    @staticmethod
    async def place_order(db, user_id: int, address_id: int, payment_method: str = "COD", product_ids: list[int] | None = None):
        if product_ids is not None:
            cart_items = await db.fetch(
                """
                SELECT c.product_id, c.quantity, p.price
                FROM cart_items c
                JOIN products p ON p.id = c.product_id
                WHERE c.user_id = $1 AND c.product_id = ANY($2::int[])
                """,
                user_id, product_ids
            )
        else:
            cart_items = await db.fetch(
                """
                SELECT c.product_id, c.quantity, p.price
                FROM cart_items c
                JOIN products p ON p.id = c.product_id
                WHERE c.user_id = $1
                """,
                user_id
            )

        if not cart_items:
            return {"success": False, "message": "No items selected"}

        subtotal = sum(item["price"] * item["quantity"] for item in cart_items)
        total_amount = subtotal + OrderService.COD_CHARGE + OrderService.PLATFORM_FEE

        order = await db.fetchrow(
            """
            INSERT INTO orders (
                user_id, address_id, total_amount, status,
                payment_method, cod_charge, platform_fee, expected_delivery_date
            )
            VALUES ($1, $2, $3, 'Pending', $4, $5, $6, $7)
            RETURNING id, created_at
            """,
            user_id, address_id, total_amount, payment_method,
            OrderService.COD_CHARGE, OrderService.PLATFORM_FEE,
            add_working_days(__import__("datetime").datetime.now().date(), 7)
        )
        order_id = order["id"]

        ordered_product_ids = []
        for item in cart_items:
            await db.execute(
                """
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES ($1, $2, $3, $4)
                """,
                order_id, item["product_id"], item["quantity"], item["price"]
            )
            await ActivityService.log_activity(db, user_id, item["product_id"], "purchase")
            ordered_product_ids.append(item["product_id"])

        await db.execute(
            "DELETE FROM cart_items WHERE user_id = $1 AND product_id = ANY($2::int[])",
            user_id, ordered_product_ids
        )

        return {
            "success": True,
            "order_id": order_id,
            "subtotal": float(subtotal),
            "cod_charge": float(OrderService.COD_CHARGE),
            "platform_fee": float(OrderService.PLATFORM_FEE),
            "total_amount": float(total_amount),
            "status": "Pending"
        }

    @staticmethod
    async def get_orders(db, user_id: int):
        rows = await db.fetch(
            """
            SELECT id, total_amount, status, created_at, expected_delivery_date
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_id
        )
        return [dict(row) for row in rows]

    @staticmethod
    async def get_order_details(db, user_id: int, order_id: int):
        order = await db.fetchrow(
            """
            SELECT
                o.id, o.total_amount, o.status, o.created_at, o.expected_delivery_date,
                o.delivered_at,
                o.cod_charge, o.platform_fee,
                a.full_name, a.phone, a.address_line1, a.address_line2,
                a.city, a.state, a.pincode, a.country
            FROM orders o
            LEFT JOIN addresses a ON o.address_id = a.id
            WHERE o.id = $1 AND o.user_id = $2
            """,
            order_id, user_id
        )

        if not order:
            return {"success": False, "message": "Order not found"}

        items = await db.fetch(
            """
            SELECT p.id, p.name, p.image_url, oi.quantity, oi.price,
                   (oi.quantity * oi.price) AS subtotal
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
            """,
            order_id
        )

        return_request = await db.fetchrow(
            "SELECT request_type, status, created_at FROM return_requests WHERE order_id = $1",
            order_id
        )

        review_rows = await db.fetch(
            "SELECT product_id, rating, reasons FROM reviews WHERE order_id = $1 AND user_id = $2",
            order_id, user_id
        )
        reviews_by_product = {row["product_id"]: {"rating": row["rating"], "reasons": row["reasons"]} for row in review_rows}

        return {
            "success": True,
            "order": dict(order),
            "items": [dict(item) for item in items],
            "return_request": dict(return_request) if return_request else None,
            "reviews": reviews_by_product
        }

    @staticmethod
    async def track_order(db, user_id: int, order_id: int):
        order = await db.fetchrow(
            """
            SELECT id, total_amount, status, created_at, expected_delivery_date
            FROM orders
            WHERE id = $1 AND user_id = $2
            """,
            order_id, user_id
        )

        if not order:
            return {"success": False, "message": "Order not found"}

        return {"success": True, "order": dict(order)}

    @staticmethod
    async def cancel_order(db, user_id: int, order_id: int):
        order = await db.fetchrow(
            "SELECT status FROM orders WHERE id = $1 AND user_id = $2",
            order_id, user_id
        )
        if not order:
            return None

        if order["status"] not in OrderService.CANCELLABLE_STATUSES:
            return {"error": True, "message": f"Order cannot be cancelled once it is {order['status']}"}

        await db.execute("UPDATE orders SET status = 'Cancelled' WHERE id = $1", order_id)
        return {"success": True, "message": "Order cancelled"}

    @staticmethod
    async def request_return(db, user_id: int, order_id: int, request_type: str, reason: str):
        order = await db.fetchrow(
            "SELECT status, delivered_at FROM orders WHERE id = $1 AND user_id = $2",
            order_id, user_id
        )
        if not order:
            return None

        if order["status"] != "Delivered":
            return {"error": True, "message": "Return/exchange is only available after delivery"}

        if order["delivered_at"] is None:
            return {"error": True, "message": "Return/exchange is not available for this order"}

        from datetime import datetime, timedelta
        deadline = order["delivered_at"] + timedelta(days=OrderService.RETURN_WINDOW_DAYS)
        if datetime.now() > deadline:
            return {"error": True, "message": "The return/exchange window for this order has closed"}

        existing = await db.fetchval(
            "SELECT 1 FROM return_requests WHERE order_id = $1", order_id
        )
        if existing:
            return {"error": True, "message": "A request already exists for this order"}

        await db.execute(
            """
            INSERT INTO return_requests (order_id, user_id, request_type, reason)
            VALUES ($1, $2, $3, $4)
            """,
            order_id, user_id, request_type, reason
        )
        return {"success": True, "message": "Request submitted"}