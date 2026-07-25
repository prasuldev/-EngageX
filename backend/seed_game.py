"""
Seeds a sample 'Beauty Match' campaign using real products from the catalog.
Run after schema.sql and campaign_schema.sql have been applied.
"""

import asyncio
import asyncpg
from b_config import DATABASE_URL  # reuse your existing config pattern

# Concern/benefit tags mapped by category name — adjust to match your actual categories
CATEGORY_CONCERN_MAP = {
    "Moisturizer": "Hydration",
    "Serum": "Brightening",
    "Cleanser": "Deep Cleansing",
    "Sunscreen": "UV Protection",
    "Acne Care": "Acne Control",
    "Toner": "Pore Minimizing",
    "Lip Care": "Lip Nourishment",
    "Eye Cream": "Dark Circle Reduction",
}


async def seed_beauty_match():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # 1. Create the campaign row
        campaign_id = await conn.fetchval(
            """
            INSERT INTO campaigns (title, description, campaign_type, reward_type,
                                     reward_value, target_context, end_date, slug)
            VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '14 days', $7)
            RETURNING id
            """,
            "Beauty Match",
            "Match each product to its skincare benefit and win rewards!",
            "memory_match",
            "coupon",
            "5% off",
            "global",
            "beauty-match-week1",
        )
        print(f"Created campaign id={campaign_id}")

        # 2. Create the card set linked to that campaign
        card_set_id = await conn.fetchval(
            """
            INSERT INTO game_card_sets (campaign_id, mode, pair_count)
            VALUES ($1, $2, $3)
            RETURNING id
            """,
            campaign_id,
            "product_concern",
            8,
        )
        print(f"Created card_set id={card_set_id}")

        # 3. Pick 8 featured/random products with images and known category
        rows = await conn.fetch(
            """
            SELECT p.id, p.name, p.image_url, c.name AS category_name
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE p.image_url IS NOT NULL
            ORDER BY RANDOM()
            LIMIT 8
            """
        )

        if len(rows) < 8:
            print(f"Warning: only found {len(rows)} eligible products (need 8)")

        # 4. Insert card pairs — fallback to category name if no concern mapping found
        for i, row in enumerate(rows):
            concern = CATEGORY_CONCERN_MAP.get(row["category_name"], row["category_name"])
            await conn.execute(
                """
                INSERT INTO game_card_pairs
                    (card_set_id, card_a_label, card_a_type, card_b_label, product_id, display_order)
                VALUES ($1, $2, 'image', $3, $4, $5)
                """,
                card_set_id,
                row["image_url"],
                concern,
                row["id"],
                i,
            )
        print(f"Inserted {len(rows)} card pairs")

        # 5. Insert tiered reward rules for this card set
        reward_tiers = [
            ("under_par_moves", 12, "coupon", "15% off"),
            ("under_time", 60, "free_sample", "Free sample with next order"),
            ("completion", None, "points", "50 loyalty points"),
        ]
        for rule_type, threshold, reward_type, reward_value in reward_tiers:
            await conn.execute(
                """
                INSERT INTO game_reward_rules
                    (card_set_id, rule_type, threshold_value, reward_type, reward_value, priority)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                card_set_id,
                rule_type,
                threshold,
                reward_type,
                reward_value,
                {"under_par_moves": 3, "under_time": 2, "completion": 1}[rule_type],
            )
        print("Inserted reward tiers")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_beauty_match())