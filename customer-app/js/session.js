const SESSION_KEY = "loggedInUser";
const TOKEN_KEY = "authToken";
const API_BASE = "https://engagex-3.onrender.com";

function escapeProductVisualText(value = "") {
    return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function productVisualMarkup(product = {}, extraClass = "") {
    const name = escapeProductVisualText(product.name || "EngageX Beauty");
    const rawCategory = (product.category_name || product.category || "beauty").toLowerCase();
    const category = escapeProductVisualText(rawCategory);
    const image = product.image_url ? escapeProductVisualText(product.image_url) : "";
    const initials = (product.brand_name || product.brand || product.name || "EX").split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase();
    const artwork = `<div class="product-visual__stage"><div class="product-visual__bottle"></div><span class="product-visual__monogram">${escapeProductVisualText(initials || "EX")}</span><span class="product-visual__label">${name}</span></div>`;
    return `<div class="product-visual ${extraClass}" data-category="${category}" role="img" aria-label="Product visual for ${name}">${artwork}${image ? `<img src="${image}" alt="${name}" loading="lazy">` : ""}</div>`;
}

// ---- Save session after login/register ----
function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

// ---- Decode JWT payload (no verification, just reading claims) ----
function decodeToken(token) {
    try {
        const payload = token.split(".")[1];
        return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch (err) {
        return null;
    }
}

// ---- Get raw token ----
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

// Get logged-in user (only returns it if token is still valid)
function getLoggedInUser() {
    const token = getToken();
    if (!token) return null;

    const decoded = decodeToken(token);
    const now = Math.floor(Date.now() / 1000);

    if (!decoded || !decoded.exp || decoded.exp < now) {
        logoutUser(); // expired or malformed, wipe it
        return null;
    }

    return JSON.parse(localStorage.getItem(SESSION_KEY));
}

// Check login status
function isLoggedIn() {
    return getLoggedInUser() !== null;
}

// Logout user
function logoutUser() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
}

// Attach token to any authenticated fetch call (for cart/orders/etc later)
async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {}),
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
        logoutUser();
        window.location.href = "login.html";
        return null;
    }
    return res;
}
/* ---- Global customer theme ---- */
(function () {
    const savedTheme =
        localStorage.getItem("engagex_theme") ||
        localStorage.getItem("theme") ||
        "system";

    const applyTheme = (theme) => {
        const isDark = theme === "dark" || (
            theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
        );

        document.documentElement.classList.toggle(
            "dark-mode",
            isDark
        );

        if (document.body) {
            document.body.classList.toggle(
                "dark-mode",
                isDark
            );
        }
    };

    applyTheme(savedTheme);

    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
    systemTheme.addEventListener("change", () => {
        const currentTheme =
            localStorage.getItem("engagex_theme") ||
            localStorage.getItem("theme") ||
            "system";
        if (currentTheme === "system") applyTheme("system");
    });
})();
