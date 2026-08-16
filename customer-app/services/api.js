import { CONFIG } from "../config/config.js";

export class ApiError extends Error {
    constructor(message, status, body) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body; // parsed error payload from the server, if any
    }
}

async function request(endpoint, options = {}) {

    const response = await fetch(
        CONFIG.BASE_URL + endpoint,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        }
    );

    if (!response.ok) {
        let errorBody = null;
        try {
            errorBody = await response.json();
        } catch {
            // response wasn't JSON (e.g. HTML error page, empty body) — ignore
        }

        throw new ApiError(
            errorBody?.detail || errorBody?.message || `API Error: ${response.status}`,
            response.status,
            errorBody
        );
    }

    return response.json();
}

export { request };