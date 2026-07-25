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

function scrollBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
        const user = getLoggedInUser();

        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userMessage,
                user_id: user ? user.id : null
            })
        });

        const data = await response.json();
        hideTyping();

        if (data.reply) {
            addMessage(data.reply, "bot");
        } else {
            addMessage("Sorry, I couldn't process that. Please try again.", "bot");
        }

    } catch (error) {
        console.error("AI chat error:", error);
        hideTyping();
        addMessage("Sorry, I'm having trouble connecting right now.", "bot");
    }
}

    /* ===========================================
       Send Message
    =========================================== */

function sendMessage() {
    const message = input.value.trim();
    if (message === "") return;
    addMessage(message, "user");
    input.value = "";
    botReply(message);
}

if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}

    /* ===========================================
       Enter Key
    =========================================== */

if (input) {

    input.addEventListener("keypress", function (event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();

        }

    });

}

    /* ===========================================
       Quick Actions
    =========================================== */

quickActions.forEach(button => {
    button.addEventListener("click", () => {
        input.value = button.textContent.trim();
        sendMessage();
    });
});
}