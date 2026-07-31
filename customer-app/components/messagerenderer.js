import { createRecommendationCard } from "./recommendationcard.js";
import { createFollowUpButtons } from "./followupbuttons.js";
import { createSkinAnalysisCard } from "./skinanalysiscard.js";
import { createRoutineCard } from "./skinroutinecard.js";
import { createIngredientCard } from "./ingredientcard.js";
import { createComparisonCard } from "./comparisoncard.js";

export function renderAIResponse(response) {

    const chatMessages = document.getElementById("chat-messages");

    // AI Message
    const wrapper = document.createElement("div");
    wrapper.className = "bot-message";

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = response.reply;

    wrapper.appendChild(content);
    chatMessages.appendChild(wrapper);

    // Product Recommendations
    if (response.products?.length) {
        response.products.forEach(product => {
            chatMessages.insertAdjacentHTML("beforeend", createRecommendationCard(product));
        });
    }

    // Suggested Questions
    if (response.follow_up?.length) {
        chatMessages.insertAdjacentHTML("beforeend", createFollowUpButtons(response.follow_up));
    }

    if (response.skin_analysis) {
        chatMessages.insertAdjacentHTML("beforeend", createSkinAnalysisCard(response.skin_analysis));
    }

    if (response.routine) {
        chatMessages.insertAdjacentHTML("beforeend", createRoutineCard(response.routine));
    }

    if (response.ingredients?.length) {
        response.ingredients.forEach(item => {
            chatMessages.insertAdjacentHTML("beforeend", createIngredientCard(item));
        });
    }

    if (response.comparison) {
        chatMessages.insertAdjacentHTML("beforeend", createComparisonCard(response.comparison));
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;

}