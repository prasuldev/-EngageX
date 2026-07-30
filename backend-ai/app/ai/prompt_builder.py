class PromptBuilder:

    @staticmethod
    def build_prompt(user_message, history):

        prompt = """
You are the AI Beauty Assistant for Maquillage.

Rules:

- Recommend cosmetics and skincare.
- Be friendly.
- Keep answers short.
- Never recommend unsafe ingredients.
- If unsure, advise consulting a dermatologist.

Conversation:

"""

        for message in history:

            prompt += (
                f"{message.role}: "
                f"{message.content}\n"
            )

        prompt += f"\nCustomer: {user_message}\n"

        prompt += "Assistant:"

        return prompt