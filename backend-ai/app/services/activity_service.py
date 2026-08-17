class ActivityService:

    @staticmethod
    async def log_activity(
        db,
        user_id: int,
        product_id: int,
        activity_type: str
    ):

        await db.execute(
            """
            INSERT INTO user_activity (
                user_id,
                product_id,
                activity_type
            )
            VALUES ($1, $2, $3)
            """,
            user_id,
            product_id,
            activity_type
        )