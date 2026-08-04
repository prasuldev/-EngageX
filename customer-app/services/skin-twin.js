import { request } from "./api.js";
import { CONFIG } from "../config/config.js";

export async function submitSkinQuiz(skinType, concerns) {

    return request(
        CONFIG.API.SKIN_TWIN_QUIZ,
        {
            method: "POST",
            body: JSON.stringify({ skin_type: skinType, concerns })
        }
    );
}