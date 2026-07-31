import { request } from "./api.js";
import { CONFIG } from "../config/config.js";

export async function sendMessage(message, history = []) {

    return request(
        CONFIG.API.AI,
        {
            method: "POST",
            body: JSON.stringify({message, history})
        }
    );
}