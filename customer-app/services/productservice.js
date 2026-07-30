import { request } from "./api.js";
import { CONFIG } from "../config/config.js";

export async function getProducts() {
    return request(CONFIG.API.PRODUCTS);
}

export async function getProduct(id) {
    return request(`${CONFIG.API.PRODUCTS}/${id}`);
}

export async function getCategories() {
    return request(CONFIG.API.CATEGORIES);
}

export async function getBrands() {
    return request(CONFIG.API.BRANDS);
}