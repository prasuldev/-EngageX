import google.generativeai as genai

from app.config import settings


class LLMService:

    def __init__(self):

        genai.configure(
            api_key=settings.GEMINI_API_KEY
        )

        self.model = genai.GenerativeModel(
            settings.GEMINI_MODEL
        )

    async def generate_reply(self, prompt: str):

        try:

            response = self.model.generate_content(prompt)

            return response.text

        except Exception as error:

            print("Gemini Error:", error)

            return (
                "Sorry, I couldn't generate a response right now."
            )