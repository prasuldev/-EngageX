document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("registerForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const fullname =
            document.getElementById("fullname").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fullname,
                    email: email,
                    password: password
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.detail || "Registration failed.");
                return;
            }

            alert("Registration Successful! Please log in.");
            window.location.href = "login.html";

        } catch (err) {
            console.error("Register error:", err);
            alert("Could not connect to server. Please try again.");
        }
    });
});