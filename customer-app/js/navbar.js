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

        profileBtn.addEventListener("click", () => {

            const user = JSON.parse(localStorage.getItem("loggedInUser"));

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

}