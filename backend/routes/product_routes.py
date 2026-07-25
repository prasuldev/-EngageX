from fastapi import APIRouter, Depends, Query
from database import get_db

router = APIRouter(tags=["products"])

@router.get("/products")
async def get_products(
    category: str | None = Query(None),
    brand: str | None = Query(None),
    featured: bool | None = Query(None),
    limit: int = 20,
    offset: int = 0,
    db=Depends(get_db)
):
    query = """
        SELECT
            p.id,
            p.name,
            p.price,
            p.rating,
            b.name AS brand_name,
            c.name AS category_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    """
    params = []
    if category:
        params.append(category)
        query += f" AND c.name = ${len(params)}"
    if brand:
        params.append(brand)
        query += f" AND b.name = ${len(params)}"
    if featured is not None:
        params.append(featured)
        query += f" AND p.is_featured = ${len(params)}"

    params.extend([limit, offset])
    query += f" ORDER BY p.id LIMIT ${len(params)-1} OFFSET ${len(params)}"

    rows = await db.fetch(query, *params)
    return [dict(r) for r in rows]


@router.get("/products/{product_id}")
async def get_product(product_id: int, db=Depends(get_db)):
    row = await db.fetchrow("""
        SELECT
            p.id, p.name, p.description, p.price, p.rating,
            b.name AS brand_name, c.name AS category_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
    """, product_id)
    return dict(row) if row else {"error": "not found"}