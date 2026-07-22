document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", (e) => {

        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const result = loginUser(email, password);

        if (!result.success) {
            alert(result.message);
            return;
        }

        alert("Login Successful!");

        window.location.href = "home.html";

    });

});