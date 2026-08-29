document.addEventListener("DOMContentLoaded", () => {

    const darkModeToggle =
        document.getElementById("darkModeToggle");

    const savedTheme =
        localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        darkModeToggle.checked = true;
    }


    darkModeToggle.addEventListener("change", () => {

        if (darkModeToggle.checked) {

            document.body.classList.add("dark-mode");

            localStorage.setItem("theme", "dark");

        } else {

            document.body.classList.remove("dark-mode");

            localStorage.setItem("theme", "light");

        }

    });


    document.getElementById("askAiBtn")
        .addEventListener("click", () => {

            window.location.href = "test-ai.html";

        });


    document.getElementById("helpBtn")
        .addEventListener("click", () => {

            alert(
                "Welcome to Maquillage Help Center. " +
                "You can use the AI Assistant to ask questions about products and your account."
            );

        });


    document.getElementById("contactBtn")
        .addEventListener("click", () => {

            alert(
                "Support contact functionality will be available soon."
            );

        });


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

});
