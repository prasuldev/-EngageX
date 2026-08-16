import { request } from "./api.js";
import { CONFIG } from "../config/config.js";

const REQUEST_TIMEOUT_MS = 20000;

export async function sendMessage(message, history = []) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await request(
            CONFIG.API.AI,
            {
                method: "POST",
                body: JSON.stringify({ message, history }),
                signal: controller.signal
            }
        );
    } finally {
        clearTimeout(timeoutId);
    }
}