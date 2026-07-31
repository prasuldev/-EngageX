import { sendMessage } from "../services/aiservice.js";
import { renderAIResponse } from "../components/messagerenderer.js";
import { getChatHistory, saveMessage } from "../services/chathistoryservice.js";
import { clearChatHistory } from "../services/chathistoryservice.js";
function initializeAI() {

    console.log("AI JS Started");
    /* ===========================================
       Get Elements
    =========================================== */

const toggleBtn = document.getElementById("ai-toggle-btn");
const welcomeCard = document.getElementById("ai-welcome-card");
const openChatBtn = document.getElementById("open-chat-btn");
const closeWelcomeBtn = document.getElementById("close-welcome");
const chatWindow = document.getElementById("ai-chat-window");
const closeChatBtn = document.getElementById("close-chat");
const sendBtn = document.getElementById("send-btn");
const input = document.getElementById("message-input");
const chatMessages = document.getElementById("chat-messages");
const typingIndicator = document.getElementById("typing-indicator");
const quickActions = document.querySelectorAll(".quick-action");

    /* ===========================================
       Show Welcome Popup
    =========================================== */

setTimeout(() => {
    if (welcomeCard) {
        welcomeCard.style.display = "block";
    }
}, 3000);

    /* ===========================================
       Auto Hide Welcome
    =========================================== */

setTimeout(() => {
    if (welcomeCard) {
        welcomeCard.style.display = "none";
    }
}, 13000);

    /* ===========================================
       Close Welcome
    =========================================== */

if (closeWelcomeBtn) {
    closeWelcomeBtn.addEventListener("click", () => {
        welcomeCard.style.display = "none";
    });
}

    /* ===========================================
       Open Chat
    =========================================== */

function openChat() {
    if (welcomeCard) {
        welcomeCard.style.display = "none";
    }
    chatWindow.style.display = "flex";
    input.focus();
}

    /* ===========================================
       Close Chat
    =========================================== */

function closeChat() {
    chatWindow.style.display = "none";
}
if (toggleBtn) {
    toggleBtn.addEventListener("click", openChat);
}

if (openChatBtn) {
    openChatBtn.addEventListener("click", openChat);
}

if (closeChatBtn) {
    closeChatBtn.addEventListener("click", closeChat);
}

    /* ===========================================
       Add Message
    =========================================== */

function addMessage(message, sender) {
    const wrapper = document.createElement("div");
    wrapper.className = sender + "-message";
    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = message;
    wrapper.appendChild(content);
    chatMessages.appendChild(wrapper);
    scrollBottom();
}

    /* ===========================================
       Scroll Bottom
    =========================================== */
const chatBody = document.querySelector(".chat-body");

function scrollBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
}

    /* ===========================================
       Typing Animation
    =========================================== */

function showTyping() {
    if (typingIndicator) {
        typingIndicator.style.display = "flex";
    }
    scrollBottom();
}

function hideTyping() {
    if (typingIndicator) {
        typingIndicator.style.display = "none";
    }
}

async function botReply(userMessage) {
    showTyping();

    try {

        const history = getChatHistory();
        const data = await sendMessage(userMessage, history);
        hideTyping();
        if (data.reply) {
            renderAIResponse(data);
            saveMessage("assistant", data.reply);

        } else {
            addMessage(
                "Sorry, I couldn't process that.",
                "bot"
            );
        }

    } catch (error) {
        console.error(error);
        hideTyping();
        addMessage(
            "Sorry, I'm having trouble connecting.",
            "bot"
        );

    }
}

    /* ===========================================
       Send Message
    =========================================== */

function handlesendMessage() {
    const message = input.value.trim();
    if (message === "") return;
    addMessage(message, "user");
    saveMessage("user", message);
    input.value = "";
    botReply(message);
}

if (sendBtn) {
    sendBtn.addEventListener("click", handlesendMessage);
}

    /* ===========================================
       Enter Key
    =========================================== */

if (input) {

    input.addEventListener("keypress", function (event) {

        if (event.key === "Enter") {

            event.preventDefault();

            handlesendMessage();

        }

    });

}

    /* ===========================================
       Quick Actions
    =========================================== */

quickActions.forEach(button => {
    button.addEventListener("click", () => {
        const query = button.dataset.query || button.textContent.trim();
        input.value = query;
        handlesendMessage();
    });
});

function loadPreviousMessages() {

    const history = getChatHistory();

    history.forEach(msg => {

        addMessage(
            msg.content,
            msg.role === "assistant"
                ? "bot"
                : "user"
        );

    });
}
loadPreviousMessages();

}

initializeAI();