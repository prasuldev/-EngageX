function initSidebarNav() {
    const navItems = document.querySelectorAll("#sidebar-nav li[data-target]");
    const panels = document.querySelectorAll(".panel");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetId = item.dataset.target;

            panels.forEach(panel => {
                panel.classList.toggle("active", panel.id === targetId);
            });

            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebarNav);
} else {
    initSidebarNav();
}
