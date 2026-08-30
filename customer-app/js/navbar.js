function initializeNavbar() {

    // Mobile Menu
    const mobileBtn = document.getElementById("mobile-menu-btn");
    const mobileMenu = document.getElementById("mobileMenu");

    if (mobileBtn && mobileMenu) {

        mobileBtn.addEventListener("click", () => {
            mobileMenu.classList.toggle("hidden");
        });

    }

    // Profile Button
    const profileBtn = document.getElementById("profileBtn");

    if (profileBtn) {

        profileBtn.addEventListener("click", (e) => {

            e.preventDefault();

            const user = JSON.parse(
                localStorage.getItem("loggedInUser")
            );

            if (user) {
                window.location.href = "../pages/profile.html";
            } else {
                window.location.href = "../pages/login.html";
            }

        });

    }

    // Refresh Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Initial Cart Count
    updateCartCount();
}

async function updateCartCount() {

    const countElement = document.getElementById("cart-count");
    if (!countElement) return;

    if (typeof isLoggedIn !== "function" || !isLoggedIn()) {
        countElement.classList.add("hidden");
        return;
    }

    const response = await authFetch(`${API_BASE}/cart`, { method: "GET" });
    if (!response || !response.ok) {
        countElement.classList.add("hidden");
        return;
    }

    const cart = await response.json();

    const totalItems = cart.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
    );

    countElement.textContent = totalItems;

    if (totalItems === 0) {
        countElement.classList.add("hidden");
    } else {
        countElement.classList.remove("hidden");
    }
}

async function updateWishlistCount() {
    const countElement = document.getElementById("wishlist-count");
    if (!countElement) return;

    if (typeof isLoggedIn !== "function" || !isLoggedIn()) {
        countElement.classList.add("hidden");
        return;
    }

    const response = await authFetch(`${API_BASE}/wishlist`, { method: "GET" });
    if (!response || !response.ok) {
        countElement.classList.add("hidden");
        return;
    }

    const wishlist = await response.json();

    if (wishlist.length > 0) {
        countElement.textContent = wishlist.length;
        countElement.classList.remove("hidden");
    } else {
        countElement.classList.add("hidden");
    }
}

// Update when page loads
document.addEventListener(
    "DOMContentLoaded",
    () => {
        initializeNavbar();
        updateCartCount();
        updateWishlistCount();
    }
);

window.addEventListener(
    "wishlistUpdated",
    updateWishlistCount
);

// Update when cart changes
window.addEventListener(
    "cartUpdated",
    updateCartCount
);

window.initializeNavbar = initializeNavbar;
window.updateCartCount = updateCartCount;
window.updateWishlistCount = updateWishlistCount;