let chatHistory = [];

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
}

/**
 * Clear chat history
 */
export function clearChatHistory() {
    chatHistory = [];
}