from app.ai.prompt_builder import PromptBuilder
from app.ai.llm_service import LLMService
from app.ai.response_builder import ResponseBuilder


class ChatService:

    def __init__(self):

        self.prompt_builder = PromptBuilder()

        self.llm = LLMService()

    async def chat(self, message, history):

        prompt = self.prompt_builder.build_prompt(
            message,
            history
        )

        reply = await self.llm.generate_reply(prompt)

        return ResponseBuilder.build(reply)