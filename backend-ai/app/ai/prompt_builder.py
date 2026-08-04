class PromptBuilder:

    @staticmethod
    def build_prompt(
        user_message,
        history,
        products,
        intent="recommendation"
    ):

        # ------------------------------------------
        # Product Information
        # ------------------------------------------

        if products:

            product_text = "Available Products:\n\n"

            for product in products:

                product_text += (
                    f"Name: {product['name']}\n"
                    f"Brand: {product['brand']}\n"
                    f"Category: {product['category']}\n"
                    f"Price: ₹{product['price']}\n"
                    f"Rating: {product['rating']}\n"
                    f"Description: {product['description']}\n"
                    f"Ingredients: {product['ingredients']}\n\n"
                )

        else:

            product_text = "No matching products found.\n"

        # ------------------------------------------
        # Common Instructions
        # ------------------------------------------

        common_rules = """
You are Aura, the Beauty Assistant for Maquillage Cosmetics.

Speak like a helpful beauty consultant.

Rules:

- Keep replies short (2-4 sentences).
- Never invent products.
- Recommend ONLY products listed below.
- Mention at most TWO products.
- Never mention you are an AI.
- Don't repeat greetings.
- Don't ask unnecessary follow-up questions.
"""

        # ------------------------------------------
        # Intent Instructions
        # ------------------------------------------

        if intent == "recommendation":

            task = """
TASK

Recommend the most suitable products.

Explain briefly why they are suitable.

Recommend only products from the Available Products list.
"""

        elif intent == "comparison":

            task = """
TASK

Compare ONLY the products listed below.

Mention:

- Purpose
- Main ingredients
- Benefits
- Which customer each product suits

Keep the comparison under 5 short bullet points.

Do not invent any information.
"""

        elif intent == "ingredient":

            task = """
TASK

Explain the ingredient in simple language.

Mention which available products contain it.

Avoid scientific jargon.
"""

        elif intent == "routine":

            task = """
TASK

Build a simple skincare routine.

Morning:
Cleanser
Moisturizer
Sun Protection

Night:
Cleanser
Face Mask
Moisturizer

Only use products from the Available Products list.
"""

        elif intent == "product_details":

            task = """
TASK

Describe the requested product.

Mention:

- what it does
- key ingredients
- benefits

Keep it under 3 sentences.
"""

        else:

            task = """
Respond naturally.
"""

        # ------------------------------------------
        # Prompt
        # ------------------------------------------

        prompt = f"""
{common_rules}

{task}

{product_text}

Conversation:
"""

        # Current session history only
        for msg in history:

            prompt += (
                f"{msg['role']}: "
                f"{msg['content']}\n"
            )

        prompt += f"""

Customer:
{user_message}

Aura:
"""

        return prompt