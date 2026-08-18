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

function updateCartCount() {

    const cart = JSON.parse(
        localStorage.getItem("cart") || "[]"
    );

    const totalItems = cart.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
    );

    const countElement =
        document.getElementById("cart-count");

    if (countElement) {

        countElement.textContent = totalItems;

        // Hide badge when cart is empty
        if (totalItems === 0) {
            countElement.classList.add("hidden");
        } else {
            countElement.classList.remove("hidden");
        }

    }
}

function updateWishlistCount() {

    const wishlist = JSON.parse(
        localStorage.getItem("wishlist") || "[]"
    );

    const countElement =
        document.getElementById("wishlist-count");

    if (!countElement) return;

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