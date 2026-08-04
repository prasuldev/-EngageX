async function loadComponent(id, file) {

    const element = document.getElementById(id);

    if (!element) return;

    try {
        const response = await fetch(file);
        element.innerHTML = await response.text();
    }
    catch (error) {
        console.error(`Error loading ${file}`, error);
    }
}

function loadScript(src, isModule = false) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        if (isModule) {
            script.type = "module";
        }
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;

        document.body.appendChild(script);

    });

}

document.addEventListener("DOMContentLoaded", async () => {

    // Load HTML Components
    await loadComponent("navbar", "../components/navbar.html");

    await loadComponent("ai-container", "../components/ai-chat.html");

    const currentPage = window.location.pathname.split("/").pop();
    if (currentPage === "home.html") {
        await loadComponent("footer", "../components/footer.html");
    }

    // Load JS Files
    await loadScript("../js/navbar.js");
    await loadScript("../js/ai.js", true);

    // Initialize Components
    if (typeof initializeNavbar === "function") {
        initializeNavbar();
    }

    if (typeof initializeAI === "function") {
        initializeAI();
    }

    if (window.lucide) {
        lucide.createIcons();
    }
    

});