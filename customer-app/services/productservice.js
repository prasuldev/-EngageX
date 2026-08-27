import { request } from "./api.js";
import { CONFIG } from "../config/config.js";

export async function getProducts(query = "") {
    return request(
        `${CONFIG.API.PRODUCTS}${query}`
    );
}

export async function getProduct(id) {
    return request(`${CONFIG.API.PRODUCTS}/${id}`);
}

export async function getCategories() {
    return request(CONFIG.API.CATEGORIES);
}

export async function getProductsByCategory(category) {

    return request(
        `${CONFIG.API.PRODUCTS}?category=${encodeURIComponent(category)}`
    );

}