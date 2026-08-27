// Fills the swatch-strip bars under the dashboard KPI cards.
// Watches #active-count / #inactive-count / #total-count for text
// changes (dashboard.js sets these after its own API calls resolve)
// and sizes each strip as a proportion of the total. Purely visual —
// safe to remove and has no effect on any other script.

(function () {
    function pct(part, total) {
        const p = parseFloat(part);
        const t = parseFloat(total);
        if (!isFinite(p) || !isFinite(t) || t <= 0) return 0;
        return Math.max(0, Math.min(100, (p / t) * 100));
    }

    function updateSwatches() {
        const active = document.getElementById("active-count");
        const inactive = document.getElementById("inactive-count");
        const total = document.getElementById("total-count");
        if (!active || !inactive || !total) return;

        const activeStrip = document.querySelector('[data-swatch="active"]');
        const inactiveStrip = document.querySelector('[data-swatch="inactive"]');
        const totalStrip = document.querySelector('[data-swatch="total"]');

        if (activeStrip) {
            activeStrip.style.setProperty("--fill", pct(active.textContent, total.textContent) + "%");
        }
        if (inactiveStrip) {
            inactiveStrip.style.setProperty("--fill", pct(inactive.textContent, total.textContent) + "%");
        }
        if (totalStrip) {
            totalStrip.style.setProperty("--fill", "100%");
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        const target = document.getElementById("panel-dashboard");
        if (!target) return;

        const observer = new MutationObserver(updateSwatches);
        observer.observe(target, { childList: true, subtree: true, characterData: true });

        updateSwatches();
    });
})();