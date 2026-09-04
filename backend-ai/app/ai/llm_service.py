import asyncio
import logging
import google.generativeai as genai
from app.config import GEMINI_MODEL
from app.config import settings

logger = logging.getLogger("engagex.llm")


class LLMService:

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)

    async def generate_reply(self, prompt: str) -> str:
        try:
            # generate_content is a blocking/synchronous SDK call — calling it
            # directly here would block the event loop for every other
            # concurrent request. Offload it to a thread.
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            return response.text

        except Exception as error:
            logger.exception("Gemini generation failed")
            # Re-raise so chat_routes.py can distinguish this failure and
            # detect rate-limit/quota errors, instead of silently returning
            # a fallback string that gets treated as a valid 200 reply.
            raise
