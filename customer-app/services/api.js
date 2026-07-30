import { CONFIG } from "../config/config.js";

async function request(endpoint, options = {}) {

    const response = await fetch(
        CONFIG.BASE_URL + endpoint,
        {
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            },
            ...options
        }
    );

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
}

export { request };