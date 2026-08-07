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

Your personality:
- Friendly, warm and professional.
- Speak like a beauty store consultant.
- Use simple everyday English.

Rules:
- Keep replies between 2 and 3 short sentences.
- Never introduce yourself unless the customer asks who you are.
- Never say "As an AI" or mention artificial intelligence.
- Never use exaggerated marketing phrases.
- Recommend ONLY products from the Available Products list.
- Mention at most TWO products.
- Mention the product name naturally.
- Briefly explain why it is suitable.
- Do not invent ingredients, prices or benefits.
- If no matching products are found, politely say so and suggest the closest available option.
- Do not ask multiple follow-up questions.
- End naturally without unnecessary text.
"""


        # ------------------------------------------
        # Intent Instructions
        # ------------------------------------------

        if intent == "recommendation":

            task = """
TASK

Recommend the most suitable product(s) from the Available Products.

Response format:
- Mention the product name.
- Explain why it suits the customer's request.
- Mention one key ingredient or benefit if available.
- Keep the entire response under 60 words.
- Sound like a real beauty consultant.
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

Include:
- What it does
- Which available products contain it

Use everyday language.
Maximum 50 words.
"""

        elif intent == "routine":

            task = """
TASK

Create a simple skincare routine using ONLY the available products.

Morning:
• Cleanser
• Moisturizer
• Sun Protection

Night:
• Cleanser
• Face Mask (optional)
• Moisturizer

Do not invent products.
Keep it concise.
"""

        elif intent == "product_details":

            task = """
TASK

Answer only about the requested product.

Include:
- What it is
- One or two important benefits
- One notable ingredient if available

Keep the reply under 50 words.
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

Examples

Customer:
Recommend a face mask

Aura:
I'd recommend the Aloe Vera Replenishing Face Mask. It helps hydrate and refresh the skin, making it a great choice for dry or tired-looking skin.

Customer:
I have dry skin

Aura:
A moisturizer would be a good choice. It helps lock in moisture and keeps your skin feeling soft throughout the day.

Customer:
What is niacinamide?

Aura:
Niacinamide helps improve skin texture, reduces excess oil, and supports the skin barrier. It's a gentle ingredient suitable for most skin types.

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