import re

class IntentService:

    CATEGORY_KEYWORDS = {

        "Cleanser": [
            "cleanser",
            "face wash",
            "wash",
            "clean"
        ],

        "Eye cream": [
            "eye cream",
            "eye",
            "dark circles",
            "puffy eyes"
        ],

        "Face Mask": [
            "mask",
            "face mask",
            "sheet mask",
            "clay mask"
        ],

        "Moisturizer": [
            "moisturizer",
            "cream",
            "hydration",
            "dry skin",
            "lotion"
        ],

        "Sun protect": [
            "sunscreen",
            "sun cream",
            "sun",
            "spf",
            "uv"
        ]

    }

    INGREDIENTS = [

        "niacinamide",
        "vitamin c",
        "retinol",
        "salicylic acid",
        "hyaluronic acid",
        "rice extract",
        "caffeine",
        "glycerin"

    ]

    PURCHASE_KEYWORDS = [

        "how to buy",
        "how do i buy",
        "how can i buy",
        "how to purchase",
        "how do i purchase",
        "how can i purchase",
        "how to order",
        "how do i order",
        "how can i order",
        "buy this",
        "purchase this",
        "order this"

    ]

    @staticmethod
    def _detect_category(text: str):
        """
        Shared category-keyword lookup, used both for plain category
        recommendations and to give purchase queries product context
        (e.g. "how do I buy a moisturizer" still carries category="Moisturizer").
        """
        for category, keywords in IntentService.CATEGORY_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                return category
        return None

    @staticmethod
    def detect_intent(message: str):

        text = message.lower()

        # -----------------------------
        # Price Detection
        # -----------------------------

        min_price = None
        max_price = None

        # under ₹500 / below 500 / less than 500

        match = re.search(
            r"(?:under|below|less than)\s*₹?\s*(\d+)",
            text
        )

        if match:
            max_price = int(match.group(1))

        # above ₹300 / over 300 / more than 300

        match = re.search(
            r"(?:above|over|more than)\s*₹?\s*(\d+)",
            text
        )

        if match:
            min_price = int(match.group(1))

        # Greeting
        if any(word in text for word in [
            "hi",
            "hello",
            "hey",
            "good morning",
            "good evening"
        ]):

            return {
                "intent": "greeting",
                "category": None,
                "ingredient": None,
                "min_price": min_price,
                "max_price": max_price,
                "products": []
            }

        # Purchase
        # Checked before comparison/ingredient/routine/category so a message
        # like "how do I buy a moisturizer" is classified as a purchase
        # question rather than a plain category recommendation.
        if any(keyword in text for keyword in IntentService.PURCHASE_KEYWORDS):

            return {
                "intent": "purchase",
                "category": IntentService._detect_category(text),
                "ingredient": None,
                "min_price": min_price,
                "max_price": max_price,
                "products": []
            }

        # Comparison
        comparison_words = [
            "compare",
            "comparison",
            "difference",
            "vs",
            "versus",
            "better"
        ]

        if any(word in text for word in comparison_words):

            return {
                "intent": "comparison",
                "category": None,
                "ingredient": None,
                "min_price": min_price,
                "max_price": max_price,
                "products": []
            }

        # Ingredient
        for ingredient in IntentService.INGREDIENTS:

            if ingredient in text:

                return {
                    "intent": "ingredient",
                    "category": None,
                    "ingredient": ingredient,
                    "min_price": min_price,
                    "max_price": max_price,
                    "products": []
                }

        # Routine
        if "routine" in text:

            return {
                "intent": "routine",
                "category": None,
                "ingredient": None,
                "min_price": min_price,
                "max_price": max_price,
                "products": []
            }

        # Category Recommendation
        category = IntentService._detect_category(text)

        if category:

            return {
                "intent": "recommendation",
                "category": category,
                "ingredient": None,
                "min_price": min_price,
                "max_price": max_price,
                "products": []
            }

        # Default
        return {
            "intent": "product_details",
            "category": None,
            "ingredient": None,
            "min_price": min_price,
            "max_price": max_price,
            "products": []
        }