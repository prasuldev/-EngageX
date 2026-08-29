document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("resetPasswordForm");
    const message = document.getElementById("resetMessage");

    if (!form) return;

    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {

        message.textContent =
            "Invalid password reset link.";

        message.classList.add("error");

        form.style.display = "none";

        return;
    }

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const newPassword =
            document.getElementById("newPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        message.textContent = "";
        message.className = "auth-message";

        // Check password length
        if (newPassword.length < 8) {

            message.textContent =
                "Password must be at least 8 characters long.";

            message.classList.add("error");

            return;
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            message.classList.add("error");

            return;
        }

        const button = form.querySelector("button");

        button.disabled = true;
        button.textContent = "Resetting...";

        try {

            const res = await fetch(`${API_BASE}/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: token,
                    new_password: newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {

                message.textContent =
                    data.detail || "Password reset failed.";

                message.classList.add("error");

                return;
            }

            message.textContent =
                "Password reset successfully! Redirecting to login...";

            message.classList.add("success");

            form.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);

        } catch (error) {

            console.error("Reset password error:", error);

            message.textContent =
                "Could not connect to the server. Please try again.";

            message.classList.add("error");

        } finally {

            button.disabled = false;
            button.textContent = "Reset Password";

        }

    });

});