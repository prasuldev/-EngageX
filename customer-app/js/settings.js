document.addEventListener("DOMContentLoaded", () => {

    // Dark Mode
    const darkModeToggle =
        document.getElementById("darkModeToggle");

    const savedTheme =
        localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");

        if (darkModeToggle) {
            darkModeToggle.checked = true;
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener("change", () => {

            if (darkModeToggle.checked) {
                document.body.classList.add("dark-mode");
                localStorage.setItem("theme", "dark");
            } else {
                document.body.classList.remove("dark-mode");
                localStorage.setItem("theme", "light");
            }

        });
    }


    // Ask AI
    const askAiBtn =
        document.getElementById("askAiBtn");

    if (askAiBtn) {
        askAiBtn.addEventListener("click", () => {
            window.location.href = "test-ai.html";
        });
    }


    // Help Center
    const helpBtn =
        document.getElementById("helpBtn");

    if (helpBtn) {
        helpBtn.addEventListener("click", () => {

            alert(
                "Welcome to Maquillage Help Center. " +
                "You can use the AI Assistant to ask questions about products and your account."
            );

        });
    }


    // Contact Support
    const contactBtn =
        document.getElementById("contactBtn");

    if (contactBtn) {
        contactBtn.addEventListener("click", () => {

            alert(
                "Support contact functionality will be available soon."
            );

        });
    }


    // Logout
    const logoutBtn =
        document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {

            if (typeof logoutUser === "function") {
                logoutUser();
            }

            window.location.href = "login.html";

        });
    }


    // Reset Password
    const resetPasswordBtn =
        document.getElementById("resetPasswordBtn");

    const passwordModal =
        document.getElementById("passwordModal");

    const closeModal =
        document.getElementById("closeModal");

    const resetPasswordForm =
        document.getElementById("resetPasswordForm");


    if (resetPasswordBtn && passwordModal) {
        resetPasswordBtn.addEventListener("click", () => {
            passwordModal.classList.remove("hidden");
        });
    }


    if (closeModal && passwordModal) {
        closeModal.addEventListener("click", () => {
            passwordModal.classList.add("hidden");
        });
    }


    window.addEventListener("click", (e) => {

        if (e.target === passwordModal) {
            passwordModal.classList.add("hidden");
        }

    });


    if (resetPasswordForm) {

        resetPasswordForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const currentPassword =
                document.getElementById("currentPassword").value;

            const newPassword =
                document.getElementById("newPassword").value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;


            if (newPassword !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }


            const response = await authFetch(
                `${API_BASE}/auth/change-password`,
                {
                    method: "PUT",
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                }
            );


            if (!response) return;


            const data = await response.json();


            if (!response.ok) {
                alert(data.detail || "Unable to reset password.");
                return;
            }


            alert("Password reset successfully.");

            passwordModal.classList.add("hidden");

            resetPasswordForm.reset();

        });

    }

});
