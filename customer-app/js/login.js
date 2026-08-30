document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.detail || "Login failed. Check your email and password.");
                return;
            }

            const data = await res.json();

            if (data.user.role !== "customer") {
                alert("This login is for customers only.");
                return;
            }

            // Store JWT + user info via session.js
            saveSession(data.access_token, data.user);

            alert("Login Successful!");
            window.location.href = "home.html";

        } catch (err) {
            console.error("Login error:", err);
            alert("Could not connect to server. Please try again.");
        }
    });

});