const STORAGE_KEY = "ai_chat_history";

/**
 * Get all chat history
 */
export function getChatHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

/**
 * Save a message
 */
export function saveMessage(role, content) {

    const history = getChatHistory();

    history.push({
        role,
        content
    });

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(history)
    );
}

/**
 * Clear chat history
 */
export function clearChatHistory() {
    localStorage.removeItem(STORAGE_KEY);
}