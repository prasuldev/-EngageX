class OrderAdminService:

    @staticmethod
    async def update_order_status(
        db,
        order_id: int,
        status: str
    ):

        valid_statuses = [
            "Pending",
            "Confirmed",
            "Packed",
            "Shipped",
            "Delivered",
            "Cancelled"
        ]

        if status not in valid_statuses:
            return {
                "success": False,
                "message": "Invalid status"
            }

        await db.execute(
            """
            UPDATE orders
            SET status = $1
            WHERE id = $2
            """,
            status,
            order_id
        )

        return {
            "success": True,
            "message": f"Order updated to {status}"
        }