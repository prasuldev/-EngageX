import { sendMessage } from "../services/aiservice.js";
import { appendMessage, renderAIResponse } from "../components/messagerenderer.js";
import { getChatHistory, saveMessage, clearChatHistory } from "../services/chathistoryservice.js";

function initializeAI() {

    const toggleBtn = document.getElementById("ai-toggle-btn");
    const welcomeCard = document.getElementById("ai-welcome-card");
    const openChatBtn = document.getElementById("open-chat-btn");
    const closeWelcomeBtn = document.getElementById("close-welcome");
    const clearChatBtn = document.getElementById("clear-chat");
    const chatWindow = document.getElementById("ai-chat-window");
    const closeChatBtn = document.getElementById("close-chat");
    const sendBtn = document.getElementById("send-btn");
    const input = document.getElementById("message-input");
    const chatMessages = document.getElementById("chat-messages");
    const typingIndicator = document.getElementById("typing-indicator");
    const quickActions = document.querySelectorAll(".quick-action");
    const statusDot = document.querySelector(".assistant-info span");

    let isWaitingForReply = false;
    let welcomeShowTimer = null;
    let welcomeHideTimer = null;

    // Accessibility: announce new messages to screen readers
    if (chatMessages) {
        chatMessages.setAttribute("aria-live", "polite");
        chatMessages.setAttribute("aria-relevant", "additions");
    }

    /* ===========================================
       Welcome Popup — shown to all visitors
    =========================================== */

    if (welcomeCard) {
        welcomeShowTimer = setTimeout(() => {
            welcomeCard.style.display = "block";
            welcomeHideTimer = setTimeout(() => {
                welcomeCard.style.display = "none";
            }, 10000);
        }, 3000);
    }

    function dismissWelcome() {
        clearTimeout(welcomeShowTimer);
        clearTimeout(welcomeHideTimer);
        if (welcomeCard) welcomeCard.style.display = "none";
    }

    if (closeWelcomeBtn) {
        closeWelcomeBtn.addEventListener("click", dismissWelcome);
    }

    /* ===========================================
       Open / Close Chat
    =========================================== */

    function openChat() {
        dismissWelcome();
        chatWindow.style.display = "flex";
        input.focus();
    }

    function closeChat() {
        chatWindow.style.display = "none";
    }

    if (toggleBtn) toggleBtn.addEventListener("click", openChat);
    if (openChatBtn) openChatBtn.addEventListener("click", openChat);
    if (closeChatBtn) closeChatBtn.addEventListener("click", closeChat);

    /* ===========================================
       Clear Chat
    =========================================== */

    if (clearChatBtn) {
        clearChatBtn.addEventListener("click", () => {
            if (!confirm("Clear this conversation? This can't be undone.")) return;
            clearChatHistory();
            chatMessages.innerHTML = "";
        });
    }

    /* ===========================================
       Typing Animation
    =========================================== */

    function showTyping() {
        if (typingIndicator) typingIndicator.style.display = "flex";
        const chatBody = document.querySelector(".chat-body");
        if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
    }

    function hideTyping() {
        if (typingIndicator) typingIndicator.style.display = "none";
    }

    /* ===========================================
       Connection status indicator
    =========================================== */

    function setStatus(state) {
        if (!statusDot) return;
        const labels = {
            online: "● Online",
            waiting: "● Thinking…",
            error: "● Connection issue",
        };
        statusDot.textContent = labels[state] || labels.online;
        statusDot.dataset.state = state;
    }

    /* ===========================================
       Send lock — prevents concurrent/duplicate sends
    =========================================== */

    function setSending(sending) {
        isWaitingForReply = sending;
        if (sendBtn) sendBtn.disabled = sending;
        if (input) input.disabled = sending;
        quickActions.forEach(btn => btn.disabled = sending);
    }

    /* ===========================================
       Bot reply with real error differentiation
    =========================================== */

    async function botReply(userMessage) {
        setSending(true);
        setStatus("waiting");
        showTyping();

        try {
            const history = getChatHistory();
            const data = await sendMessage(userMessage, history);
            hideTyping();
            setStatus("online");

            if (data && data.reply) {
                renderAIResponse(data);
                saveMessage("assistant", data.reply);
            } else {
                appendMessage("I couldn't quite process that — could you rephrase?", "bot");
            }

        } catch (error) {
            hideTyping();
            setStatus("error");
            console.error("AI chat error:", error);

            const status = error?.status;

            if (status === 429) {
                appendMessage("I'm getting a lot of requests right now — please try again in a moment.", "bot");
            } else if (error.name === "AbortError") {
                appendMessage("That took too long to respond. Please try again.", "bot");
            } else if (!navigator.onLine) {
                appendMessage("You're offline — check your connection and try again.", "bot");
            } else {
                appendMessage("Something went wrong on my end. Please try again shortly.", "bot");
            }
        } finally {
            setSending(false);
            input.focus();
        }
    }

    /* ===========================================
       Send Message
    =========================================== */

    function handlesendMessage() {
        if (isWaitingForReply) return;
        const message = input.value.trim();
        if (message === "") return;

        appendMessage(message, "user");
        saveMessage("user", message);
        input.value = "";
        botReply(message);
    }

    if (sendBtn) sendBtn.addEventListener("click", handlesendMessage);

    if (input) {
        input.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                handlesendMessage();
            }
        });
    }

    quickActions.forEach(button => {
        button.addEventListener("click", () => {
            if (isWaitingForReply) return;
            const query = button.dataset.query || button.textContent.trim();
            input.value = query;
            handlesendMessage();
        });
    });

    /* ===========================================
       Load previous messages (persisted via sessionStorage)
    =========================================== */

    function loadPreviousMessages() {
        const history = getChatHistory();
        history.forEach(msg => {
            appendMessage(msg.content, msg.role === "assistant" ? "bot" : "user");
        });
    }
    loadPreviousMessages();
}

initializeAI();