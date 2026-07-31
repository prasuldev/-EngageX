"""
Seeds a sample 'Beauty Match' campaign using real products from the catalog.
Run after schema.sql and campaign_schema.sql have been applied.
"""

import asyncio
import asyncpg
from app.config import DATABASE_URL

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

# Priority order for reward tiers — best reward checked first at claim time
REWARD_TIER_PRIORITY = {"under_time": 2, "completion": 1}

REQUIRED_PAIRS = 8


async def seed_beauty_match():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        async with conn.transaction():
            # 1. Pick eligible products FIRST, so we can bail before writing
            #    anything if the catalog can't support a full board.
            rows = await conn.fetch(
                """
                SELECT p.id, p.name, c.name AS category_name
                FROM products p
                JOIN categories c ON c.id = p.category_id
                ORDER BY RANDOM()
                LIMIT $1
                """,
                REQUIRED_PAIRS,
            )

            if len(rows) < REQUIRED_PAIRS:
                raise ValueError(
                    f"Need {REQUIRED_PAIRS} eligible products (with image_url) "
                    f"to build a clean memory board, found {len(rows)}. Aborting seed."
                )

            # 2. Create the campaign row
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

            # 3. Create the card set linked to that campaign
            #    pair_count now reflects the actual number of pairs inserted.
            card_set_id = await conn.fetchval(
                """
                INSERT INTO game_card_sets (campaign_id, mode, pair_count)
                VALUES ($1, $2, $3)
                RETURNING id
                """,
                campaign_id,
                "product_concern",
                len(rows),
            )
            print(f"Created card_set id={card_set_id}")

            # 4. Insert card pairs.
            #    card_a = product image (card_a_type='image', card_a_label=image_url),
            #    card_b = concern/benefit text. Product name isn't stored here —
            #    the frontend can join `products` via product_id if it needs to
            #    display the name after a match.
            for i, row in enumerate(rows):
                concern = CATEGORY_CONCERN_MAP.get(row["category_name"], row["category_name"])
                await conn.execute(
                    """
                    INSERT INTO game_card_pairs
                        (card_set_id, card_a_label, card_a_type, card_b_label,
                         product_id, display_order)
                    VALUES ($1, $2, 'text', $3, $4, $5)
                    """,
                    card_set_id,
                    row["name"],
                    concern,
                    row["id"],
                    i,
                )
            print(f"Inserted {len(rows)} card pairs: " + ", ".join(r['name'] for r in rows))

            # 5. Insert tiered reward rules for this card set
            reward_tiers = [
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
                    REWARD_TIER_PRIORITY[rule_type],
                )
            print("Inserted reward tiers")

    except ValueError as e:
        print(f"Seed aborted: {e}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_beauty_match())