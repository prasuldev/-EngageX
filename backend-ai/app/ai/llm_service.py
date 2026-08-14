from google import genai

from app.config import settings


class LLMService:

    def __init__(self):
        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY
        )

    async def generate_reply(self, prompt: str):
        try:
            response = self.client.models.generate_content(
               model="gemini-flash-latest",
               contents=prompt
            )

            return response.text

        except Exception as error:
            print("Gemini Error:", error)

            return "Sorry, I couldn't generate a response right now."
        
