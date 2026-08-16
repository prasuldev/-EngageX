class AddressService:

    @staticmethod
    async def create_address(
        db,
        user_id: int,
        payload
    ):

        await db.execute(
            """
            INSERT INTO addresses (
                user_id,
                full_name,
                phone,
                address_line1,
                address_line2,
                city,
                state,
                pincode,
                country,
                is_default
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
            )
            """,
            user_id,
            payload.full_name,
            payload.phone,
            payload.address_line1,
            payload.address_line2,
            payload.city,
            payload.state,
            payload.pincode,
            payload.country,
            payload.is_default
        )

        return {
            "success": True,
            "message": "Address added"
        }

    @staticmethod
    async def get_addresses(
        db,
        user_id: int
    ):

        rows = await db.fetch(
            """
            SELECT *
            FROM addresses
            WHERE user_id = $1
            ORDER BY is_default DESC, id DESC
            """,
            user_id
        )

        return [dict(row) for row in rows]

    @staticmethod
    async def delete_address(
        db,
        user_id: int,
        address_id: int
    ):

        await db.execute(
            """
            DELETE FROM addresses
            WHERE id = $1
            AND user_id = $2
            """,
            address_id,
            user_id
        )

        return {
            "success": True,
            "message": "Address deleted"
        }

    