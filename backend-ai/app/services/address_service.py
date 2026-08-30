class AddressService:

    @staticmethod
    async def create_address(db, user_id: int, payload):
        async with db.transaction():
            if payload.is_default:
                await db.execute(
                    "UPDATE addresses SET is_default = FALSE WHERE user_id = $1",
                    user_id
                )

            await db.execute(
                """
                INSERT INTO addresses (
                    user_id, full_name, phone, address_line1, address_line2,
                    city, state, pincode, country, is_default
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                """,
                user_id, payload.full_name, payload.phone, payload.address_line1,
                payload.address_line2, payload.city, payload.state,
                payload.pincode, payload.country, payload.is_default
            )

        return {"success": True, "message": "Address added"}

    @staticmethod
    async def get_addresses(db, user_id: int):
        rows = await db.fetch(
            """
            SELECT * FROM addresses
            WHERE user_id = $1
            ORDER BY is_default DESC, id DESC
            """,
            user_id
        )
        return [dict(row) for row in rows]

    @staticmethod
    async def update_address(db, user_id: int, address_id: int, payload):
        async with db.transaction():
            if payload.is_default:
                await db.execute(
                    "UPDATE addresses SET is_default = FALSE WHERE user_id = $1",
                    user_id
                )

            result = await db.execute(
                """
                UPDATE addresses SET
                    full_name = $1, phone = $2, address_line1 = $3, address_line2 = $4,
                    city = $5, state = $6, pincode = $7, country = $8, is_default = $9
                WHERE id = $10 AND user_id = $11
                """,
                payload.full_name, payload.phone, payload.address_line1, payload.address_line2,
                payload.city, payload.state, payload.pincode, payload.country,
                payload.is_default, address_id, user_id
            )

        if result == "UPDATE 0":
            return None
        return {"success": True, "message": "Address updated"}

    @staticmethod
    async def set_default_address(db, user_id: int, address_id: int):
        async with db.transaction():
            await db.execute(
                "UPDATE addresses SET is_default = FALSE WHERE user_id = $1",
                user_id
            )
            result = await db.execute(
                "UPDATE addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2",
                address_id, user_id
            )

        if result == "UPDATE 0":
            return None
        return {"success": True, "message": "Default address updated"}

    @staticmethod
    async def delete_address(db, user_id: int, address_id: int):
        used_in_order = await db.fetchval(
            "SELECT 1 FROM orders WHERE address_id = $1 LIMIT 1",
            address_id
        )
        if used_in_order:
            return {"conflict": True, "message": "This address is linked to a past order and can't be deleted"}

        result = await db.execute(
            "DELETE FROM addresses WHERE id = $1 AND user_id = $2",
            address_id, user_id
        )
        if result == "DELETE 0":
            return None
        return {"success": True, "message": "Address deleted"}