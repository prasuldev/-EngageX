async def resolve_product_for_category(conn, category_id: int) -> dict | None:
    """
    Returns the best single product for a given category_id.
    Priority: featured first, then most recently added.
    Returns None if no active product exists in that category.
    """
    row = await conn.fetchrow(
        """
        SELECT id, name, price, image_url
        FROM products
        WHERE category_id = $1
        ORDER BY is_featured DESC, created_at DESC
        LIMIT 1
        """,
        category_id
    )
    return dict(row) if row else None