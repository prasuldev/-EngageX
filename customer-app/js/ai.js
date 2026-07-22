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

    /* ===========================================
       Dummy AI Response
    =========================================== */

function botReply(userMessage) {
    showTyping();
    setTimeout(() => {
        hideTyping();
        addMessage(
            "Thanks for your question! This is a demo response. Later, Gemini/OpenAI will answer: \"" +
            userMessage +
            "\"",
            "bot"
        );
    }, 1500);
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