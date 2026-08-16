const STORAGE_KEY = "engagex_chat_history";
const MAX_HISTORY_MESSAGES = 50; // cap so storage doesn't grow unbounded

let chatHistory = loadFromStorage();

function loadFromStorage() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.warn("Could not read chat history from storage:", error);
        return [];
    }
}

function persist() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (error) {
        // sessionStorage can throw if full or disabled (private browsing, etc.)
        console.warn("Could not save chat history:", error);
    }
}

/**
 * Get all chat history
 */
export function getChatHistory() {
    return chatHistory;
}

/**
 * Save a message
 */
export function saveMessage(role, content) {
    chatHistory.push({ role, content });
    if (chatHistory.length > MAX_HISTORY_MESSAGES) {
        chatHistory = chatHistory.slice(-MAX_HISTORY_MESSAGES);
    }
    persist();
}

/**
 * Clear chat history
 */
export function clearChatHistory() {
    chatHistory = [];
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn("Could not clear stored chat history:", error);
    }
}