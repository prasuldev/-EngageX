class OrderAdminService:

    STATUS_SEQUENCE = ["Pending", "Confirmed", "Shipped", "Delivered"]
    TERMINAL_STATUSES = ["Delivered", "Cancelled"]
    VALID_STATUSES = STATUS_SEQUENCE + ["Cancelled"]
    RETURN_VALID_STATUSES = ["Approved", "Rejected", "Completed"]

    @staticmethod
    async def list_orders(db, status: str | None = None, limit: int = 50, offset: int = 0):
        base_query = """
            SELECT o.id, o.total_amount, o.status, o.created_at, o.expected_delivery_date,
                    o.delivered_at,
                    a.full_name, a.phone,
                    rr.request_type AS return_type, rr.status AS return_status
            FROM orders o
            LEFT JOIN addresses a ON o.address_id = a.id
            LEFT JOIN return_requests rr ON rr.order_id = o.id
        """
        if status:
            rows = await db.fetch(
                base_query + " WHERE o.status = $1 ORDER BY o.created_at DESC LIMIT $2 OFFSET $3",
                status, limit, offset
            )
        else:
            rows = await db.fetch(
                base_query + " ORDER BY o.created_at DESC LIMIT $1 OFFSET $2",
                limit, offset
            )
        return [dict(row) for row in rows]

    @staticmethod
    async def get_order_detail(db, order_id: int):
        order = await db.fetchrow(
            """
            SELECT
                o.id, o.user_id, o.total_amount, o.status, o.created_at, o.expected_delivery_date,
                o.cod_charge, o.platform_fee, o.payment_method,
                a.full_name, a.phone, a.address_line1, a.address_line2,
                a.city, a.state, a.pincode, a.country
            FROM orders o
            LEFT JOIN addresses a ON o.address_id = a.id
            WHERE o.id = $1
            """,
            order_id
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
            "SELECT request_type, status, reason, created_at FROM return_requests WHERE order_id = $1",
            order_id
        )

        return {
            "success": True,
            "order": dict(order),
            "items": [dict(item) for item in items],
            "return_request": dict(return_request) if return_request else None
        }

    @staticmethod
    async def update_order_status(db, order_id: int, status: str):
        if status not in OrderAdminService.VALID_STATUSES:
            return {"success": False, "message": "Invalid status"}

        row = await db.fetchrow("SELECT status FROM orders WHERE id = $1", order_id)
        if row is None:
            return {"success": False, "message": "Order not found"}

        current_status = row["status"]

        if current_status in OrderAdminService.TERMINAL_STATUSES:
            return {"success": False, "message": f"Order is already {current_status} and cannot be updated"}

        if status != "Cancelled":
            current_index = (
                OrderAdminService.STATUS_SEQUENCE.index(current_status)
                if current_status in OrderAdminService.STATUS_SEQUENCE else -1
            )
            new_index = OrderAdminService.STATUS_SEQUENCE.index(status)
            if new_index <= current_index:
                return {"success": False, "message": f"Cannot move status backward from {current_status} to {status}"}

        if status == "Delivered":
            await db.execute(
                "UPDATE orders SET status = $1, delivered_at = now() WHERE id = $2",
                status, order_id
            )
        else:
            await db.execute("UPDATE orders SET status = $1 WHERE id = $2", status, order_id)

        return {"success": True, "message": f"Order updated to {status}"}

    @staticmethod
    async def update_return_status(db, order_id: int, status: str):
        if status not in OrderAdminService.RETURN_VALID_STATUSES:
            return {"success": False, "message": "Invalid return status"}

        row = await db.fetchrow(
            "SELECT status FROM return_requests WHERE order_id = $1", order_id
        )
        if row is None:
            return {"success": False, "message": "No return request found for this order"}

        current = row["status"]

        if current == "Completed" or current == "Rejected":
            return {"success": False, "message": f"Return request is already {current} and cannot be updated"}

        if status == "Completed" and current != "Approved":
            return {"success": False, "message": "Return must be Approved before it can be Completed"}

        await db.execute(
            "UPDATE return_requests SET status = $1 WHERE order_id = $2",
            status, order_id
        )
        return {"success": True, "message": f"Return request updated to {status}"}