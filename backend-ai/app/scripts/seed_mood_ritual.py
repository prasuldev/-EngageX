import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

MOODS = [
    {
        "slug": "running_on_empty",
        "label": "Running on empty",
        "subtext": "4 hours of sleep, skin's showing it",
        "emoji": "😴",
        "relevant_categories": [1, 3, 2, 4],  # Cleanser", "Face Mask", "Eye cream", "Moisturizer"
    },
    {
        "slug": "out_the_door",
        "label": "Out the door",
        "subtext": "Heading out, need protection",
        "emoji": "🌤️",
        "relevant_categories": [1, 4, 5], # "Cleanser", "Moisturizer", "Sun protect"
    },
    {
        "slug": "stressed_breaking_out",
        "label": "Stressed & breaking out",
        "subtext": "Skin's not okay right now",
        "emoji": "😤",
        "relevant_categories": [1, 3, 4], #"Cleanser", "Face Mask", "Moisturizer"
    },
    {
        "slug": "sunday_reset",
        "label": "Sunday reset",
        "subtext": "Full ritual, no rushing",
        "emoji": "🛁",
        "relevant_categories": [1, 3, 2, 4, 5], # "Cleanser", "Face Mask", "Eye cream", "Moisturizer", "Sun protect"
    },
    {
        "slug": "two_minutes_flat",
        "label": "Two minutes flat",
        "subtext": "That's all I've got today",
        "emoji": "⏱️",
        "relevant_categories": [1, 4], # "Cleanser", "Moisturizer"
    },
]

async def seed():
    conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
    try:
        for mood in MOODS:
            await conn.execute(
                """
                INSERT INTO mood_ritual_moods (slug, label, subtext, emoji, relevant_categories)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (slug) DO UPDATE SET
                    label = EXCLUDED.label,
                    subtext = EXCLUDED.subtext,
                    emoji = EXCLUDED.emoji,
                    relevant_categories = EXCLUDED.relevant_categories
                """,
                mood["slug"], mood["label"], mood["subtext"], mood["emoji"], mood["relevant_categories"]
            )
        print(f"Seeded {len(MOODS)} moods.")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(seed())