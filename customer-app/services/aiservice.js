import { apiRequest } from "./api.js";
import { CONFIG } from "../config/config.js";

export async function sendMessage(message, history = []) {

    return apiRequest(
        CONFIG.API.CHAT,
        {
            method: "POST",
            body: JSON.stringify({
                message,
                history
            })
        }
    );
}

const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        message,
        user_id,
        history
    })
});

const data = await response.json();