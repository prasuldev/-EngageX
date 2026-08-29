document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("forgotPasswordForm");
    const message = document.getElementById("forgotMessage");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();

        if (!email) {
            return;
        }

        const button = form.querySelector("button");

        button.disabled = true;
        button.textContent = "Sending...";

        message.textContent = "";
        message.className = "auth-message";

        try {

            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email
                })
            });

            const data = await res.json();

            if (!res.ok) {

                message.textContent =
                    data.detail || "Something went wrong. Please try again.";

                message.classList.add("error");

                return;
            }

            /*
             * The backend intentionally gives the same response
             * whether the email exists or not.
             */
            message.textContent =
                "If that email is registered, a password reset link has been sent. Please check your inbox.";

            message.classList.add("success");

            form.reset();

        } catch (error) {

            console.error("Forgot password error:", error);

            message.textContent =
                "Could not connect to the server. Please try again.";

            message.classList.add("error");

        } finally {

            button.disabled = false;
            button.textContent = "Send Reset Link";

        }

    });

});