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

function loadScript(src) {

    return new Promise((resolve, reject) => {

        const script = document.createElement("script");

        script.src = src;

        script.onload = resolve;

        script.onerror = reject;

        document.body.appendChild(script);

    });

}

document.addEventListener("DOMContentLoaded", async () => {

    // Load HTML Components
    await loadComponent("navbar", "../components/navbar.html");

    await loadComponent("footer", "../components/footer.html");

    await loadComponent("ai-container", "../components/ai-chat.html");

    // Load JS Files
    await loadScript("../js/navbar.js");

    await loadScript("../js/ai.js");

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