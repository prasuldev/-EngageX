import { createFollowUpButtons } from "./followupbuttons.js";
import { createSkinAnalysisCard } from "./skinanalysiscard.js";
import { createRoutineCard } from "./skinroutinecard.js";
import { createIngredientCard } from "./ingredientcard.js";
import { createComparisonCard } from "./comparisoncard.js";

function formatTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
    const chatBody = document.querySelector(".chat-body");
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}

/**
 * Appends a plain text message bubble (user or bot) with a timestamp.
 * Single source of truth for message-bubble markup — used for both
 * user messages and simple bot replies, so bubbles never drift out
 * of sync between plain text and rich (card-based) responses.
 */
export function appendMessage(message, sender) {
    const chatMessages = document.getElementById("chat-messages");
    if (!chatMessages) return null;

    const wrapper = document.createElement("div");
    wrapper.className = sender + "-message";

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = message;

    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = formatTime();

    wrapper.appendChild(content);
    wrapper.appendChild(time);
    chatMessages.appendChild(wrapper);
    scrollToBottom();

    return wrapper;
}

export function renderAIResponse(response) {
    const chatMessages = document.getElementById("chat-messages");
    if (!chatMessages || !response) return;

    if (response.reply) {
        appendMessage(response.reply, "bot");
    }

    // NOTE: createFollowUpButtons / createSkinAnalysisCard / createRoutineCard /
    // createIngredientCard / createComparisonCard are injected via insertAdjacentHTML.
    // If any of these build their HTML by interpolating a string (product name,
    // Gemini-derived text, etc.) without escaping it, this is an XSS vector. Worth
    // auditing each of those files to confirm they escape any dynamic text before
    // inserting it into the template string.

    // Product recommendation cards are intentionally NOT rendered in chat.
    // response.products is still returned by the backend (harmless — unused
    // here) but the reply text itself already mentions products conversationally.
    // If the user asks how to buy something, the backend answers with purchase
    // steps as text instead (see chat_routes.py).

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

    scrollToBottom();
}