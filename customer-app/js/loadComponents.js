async function loadComponent(id, file) {

    const element = document.getElementById(id);

    if (!element) return;

    try {
        const response = await fetch(file);
        element.innerHTML = await response.text();
    } catch (error) {
        console.error(`Error loading ${file}`,error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    await loadComponent("navbar", "../components/navbar.html");

    await loadComponent("ai-section", "../components/ai-chat.html");

    if (typeof initializeNavbar === "function") {
        initializeNavbar();
    }

    if (typeof initializeAI === "function") {
        initializeAI();
    }

});