import asyncio
import json
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:yourpassword@localhost:5432/engagex_db"
)

# Adjust this path to wherever your JSON actually lives
JSON_PATH = "../customer-app/data/products.json"

async def seed():
    conn = await asyncpg.connect(dsn=DATABASE_URL)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        products = json.load(f)

    print(f"Loaded {len(products)} products from JSON")

    # Collect unique brands and categories
    brand_names = sorted(set(p["Brand"].strip() for p in products if p.get("Brand")))
    category_names = sorted(set(p["Category"].strip() for p in products if p.get("Category")))

    # Insert brands, get id map
    brand_id_map = {}
    for name in brand_names:
        row = await conn.fetchrow(
            "INSERT INTO brands (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
            name
        )
        brand_id_map[name] = row["id"]

    # Insert categories, get id map
    category_id_map = {}
    for name in category_names:
        row = await conn.fetchrow(
            "INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
            name
        )
        category_id_map[name] = row["id"]

    print(f"Inserted {len(brand_id_map)} brands, {len(category_id_map)} categories")

    # Insert products
    inserted = 0
    for p in products:
        brand = (p.get("Brand") or "").strip()
        category = (p.get("Category") or "").strip()
        name = (p.get("Product_Name") or "").strip()
        price = p.get("Price") or 0
        rating = p.get("Rating") or 0
        ingredients = p.get("Ingredients") or None
        image_url = p.get("Image") or None

        if not name or brand not in brand_id_map or category not in category_id_map:
            continue

        await conn.execute(
            """
            INSERT INTO products (name, price, rating, ingredients, image_url, brand_id, category_id, is_featured)
            VALUES ($1, $2, $3, $4, $5, $6, $7, false)
            """,
            name, price, rating, ingredients, image_url,
            brand_id_map[brand], category_id_map[category]
        )
        inserted += 1

    print(f"Inserted {inserted} products")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(seed())