function initializeNavbar() {

    const mobileBtn = document.getElementById("mobileMenuBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener("click", () => {
            mobileMenu.classList.toggle("hidden");
        });
    }

    lucide.createIcons();const profileBtn = document.getElementById("profileBtn");

if (profileBtn) {

    profileBtn.addEventListener("click", () => {

        const user =
            JSON.parse(localStorage.getItem("loggedInUser"));

        if (user) {

            window.location.href = "../pages/profile.html";

        } else {

            window.location.href = "../pages/login.html";

        }

    });

}

}