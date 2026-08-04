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

    @staticmethod
    def detect_intent(message: str):

        text = message.lower()

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
                "products": []
            }

        # Ingredient
        for ingredient in IntentService.INGREDIENTS:

            if ingredient in text:

                return {
                    "intent": "ingredient",
                    "category": None,
                    "ingredient": ingredient,
                    "products": []
                }

        # Routine
        if "routine" in text:

            return {
                "intent": "routine",
                "category": None,
                "ingredient": None,
                "products": []
            }

        # Category Recommendation
        for category, keywords in IntentService.CATEGORY_KEYWORDS.items():

            if any(keyword in text for keyword in keywords):

                return {
                    "intent": "recommendation",
                    "category": category,
                    "ingredient": None,
                    "products": []
                }

        # Default
        return {
            "intent": "product_details",
            "category": None,
            "ingredient": None,
            "products": []
        }