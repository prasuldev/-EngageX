class ProductService:

    @staticmethod
    async def search_products(
        db,
        message,
        category=None,
        ingredient=None,
        intent="recommendation",
        min_price=None,
        max_price=None
    ):

        message = message.lower()

        # ---------------------------------
        # 1. Search by Category
        # ---------------------------------

        if category:

            query = """
            SELECT
                p.id,
                p.name,
               b.name AS brand,
               c.name AS category,
               p.description,
               p.price,
               p.rating,
               p.ingredients
            FROM products p
            LEFT JOIN brands b
                ON p.brand_id = b.id
            LEFT JOIN categories c
                ON p.category_id = c.id
            WHERE LOWER(c.name) = LOWER($1)
            """

            params = [category]

            if min_price is not None:
                query += f" AND p.price >= ${len(params)+1}"
                params.append(min_price)

            if max_price is not None:
                query += f" AND p.price <= ${len(params)+1}"
                params.append(max_price)

            query += """
            ORDER BY p.rating DESC
            LIMIT 3
            """

            products = await db.fetch(query, *params)

            if products:
                return products

        # ---------------------------------
        # 2. Search by Ingredient
        # ---------------------------------

        if ingredient:

            products = await db.fetch(
                """
                SELECT
                    p.id,
                    p.name,
                    b.name AS brand,
                    c.name AS category,
                    p.description,
                    p.price,
                    p.rating,
                    p.ingredients,
                    p.image_url
                FROM products p
                LEFT JOIN brands b
                    ON p.brand_id = b.id
                LEFT JOIN categories c
                    ON p.category_id = c.id
                WHERE LOWER(COALESCE(p.ingredients,'')) LIKE $1
                ORDER BY p.rating DESC
                LIMIT 3
                """,
                f"%{ingredient}%"
            )

            if products:
                return products

        # ---------------------------------
        # 3. Search by Product Name / Brand / Category
        # ---------------------------------

        products = await db.fetch(
            """
            SELECT
                p.id,
                p.name,
                b.name AS brand,
                c.name AS category,
                p.description,
                p.price,
                p.rating,
                p.ingredients,
                p.image_url
            FROM products p
            LEFT JOIN brands b
                ON p.brand_id = b.id
            LEFT JOIN categories c
                ON p.category_id = c.id
            WHERE
                LOWER(p.name) LIKE $1
                OR LOWER(COALESCE(b.name,'')) LIKE $1
                OR LOWER(COALESCE(c.name,'')) LIKE $1
                OR LOWER(COALESCE(p.ingredients,'')) LIKE $1
                OR LOWER(COALESCE(p.description,'')) LIKE $1
            ORDER BY p.rating DESC
            LIMIT 3
            """,
            f"%{message}%"
        )

        if products:
            return products

        # ---------------------------------
        # 4. Fallback - Top Rated Products
        # ---------------------------------

        products = await db.fetch(
            """
            SELECT
                p.id,
                p.name,
                b.name AS brand,
                c.name AS category,
                p.description,
                p.price,
                p.rating,
                p.ingredients,
                p.image_url
            FROM products p
            LEFT JOIN brands b
                ON p.brand_id = b.id
            LEFT JOIN categories c
                ON p.category_id = c.id
            ORDER BY p.rating DESC
            LIMIT 3
            """
        )

        return products

    @staticmethod
    async def find_products_by_name(db, message):

        products = await db.fetch(
            """
            SELECT
                p.id,
                p.name,
                b.name AS brand,
                c.name AS category,
                p.price,
                p.rating,
                p.ingredients
            FROM products p
            LEFT JOIN brands b
                ON p.brand_id = b.id
            LEFT JOIN categories c
                ON p.category_id = c.id
            WHERE LOWER($1) LIKE '%' || LOWER(p.name) || '%'
            ORDER BY p.rating DESC
            LIMIT 2
            """,
            message
        )

        return products