const SESSION_KEY = "loggedInUser";
const TOKEN_KEY = "authToken";
const API_BASE = "https://engagex-3.onrender.com";

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
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.documentElement.classList.add("dark-mode");

        if (document.body) {
            document.body.classList.add("dark-mode");
        }
    }
})();
