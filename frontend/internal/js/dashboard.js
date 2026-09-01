document.addEventListener("DOMContentLoaded", initDashboard);

async function loadDashboard() {
    const data = await apiGet("/api/internal/dashboard/campaign-overview");

    if (!data) return;

    const active = document.getElementById("active-count");
    const inactive = document.getElementById("inactive-count");
    const total = document.getElementById("total-count");

    if (active) {
        active.textContent = Number(data.active_campaigns || 0).toLocaleString();
    }

    if (inactive) {
        inactive.textContent = Number(data.inactive_campaigns || 0).toLocaleString();
    }

    if (total) {
        total.textContent = Number(data.total_campaigns || 0).toLocaleString();
    }
}

async function loadSalesOverview() {
    const data = await apiGet("/api/internal/dashboard/sales-overview");

    if (!data) return;

    const totalCustomers = document.getElementById("total-customers");
    const totalOrders = document.getElementById("total-orders");
    const totalRevenue = document.getElementById("total-revenue");

    if (totalCustomers) {
        totalCustomers.textContent =
            Number(data.total_customers || 0).toLocaleString();
    }

    if (totalOrders) {
        totalOrders.textContent =
            Number(data.total_orders || 0).toLocaleString();
    }

    if (totalRevenue) {
        totalRevenue.textContent =
            `₹${Number(data.revenue || 0).toLocaleString("en-IN")}`;
    }

    const tbody = document.querySelector("#recent-orders-table tbody");

    if (!tbody) return;

    const orders = data.recent_orders || [];

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">No orders yet</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const date = order.date
            ? new Date(order.date).toLocaleDateString("en-IN")
            : "—";

        return `
            <tr>
                <td>#${order.order_id}</td>
                <td>${order.customer || "—"}</td>
                <td>₹${Number(order.amount || 0).toLocaleString("en-IN")}</td>
                <td>${order.status || "—"}</td>
                <td>${date}</td>
            </tr>
        `;
    }).join("");
}

async function loadCampaignPerformance() {
    const data = await apiGet(
        "/api/internal/dashboard/campaign-performance"
    );

    if (!data) return;

    const tbody = document.querySelector("#performance-table tbody");

    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">No campaigns yet</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(campaign => `
        <tr>
            <td>${campaign.title || "—"}</td>
            <td>${campaign.campaign_type || "—"}</td>
            <td>${campaign.is_active ? "Active" : "Inactive"}</td>
            <td>${Number(campaign.participants || 0).toLocaleString()}</td>
            <td>${Number(campaign.total_responses || 0).toLocaleString()}</td>
        </tr>
    `).join("");
}

async function loadBeautyMatchPerformance() {
    const data = await apiGet(
        "/api/internal/dashboard/beauty-match-performance"
    );

    if (!data) return;

    const tbody = document.querySelector("#beauty-match-table tbody");

    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">No Beauty Match data yet</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.title || "—"}</td>
            <td>${Number(item.total_plays || 0).toLocaleString()}</td>
            <td>${Number(item.completions || 0).toLocaleString()}</td>
            <td>${Number(item.avg_moves || 0).toLocaleString()}</td>
            <td>${Number(item.avg_time_seconds || 0).toLocaleString()}</td>
        </tr>
    `).join("");
}

async function loadCustomerSegments() {
    const data = await apiGet(
        "/api/internal/dashboard/customer-segments"
    );

    if (!data) return;
}

async function loadAIInsights() {
    const data = await apiGet(
        "/api/internal/dashboard/ai-insights"
    );

    if (!data) return;

    const container = document.getElementById("ai-insights");

    if (!container) return;

    if (typeof data === "string") {
        container.textContent = data;
    } else {
        container.textContent =
            data.insight ||
            data.message ||
            "No AI insights available.";
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll("#sidebar-nav li");
    const panels = document.querySelectorAll(".panel");

    navItems.forEach(item => {
        item.addEventListener("click", async () => {
            const targetId = item.dataset.target;

            navItems.forEach(nav => {
                nav.classList.remove("active");
            });

            item.classList.add("active");

            panels.forEach(panel => {
                panel.classList.toggle(
                    "active",
                    panel.id === targetId
                );
            });

            if (targetId === "panel-dashboard") {
                await loadDashboard();
                await loadSalesOverview();
            }

            if (targetId === "panel-campaigns") {
                await loadCampaignPerformance();
            }

            if (targetId === "panel-analytics") {
                await loadBeautyMatchPerformance();
                await loadCustomerSegments();
            }

            if (targetId === "panel-generator") {
                await loadAIInsights();
            }
        });
    });
}

async function initDashboard() {
    setupNavigation();

    await loadDashboard();
    await loadSalesOverview();
    await loadCampaignPerformance();
    await loadBeautyMatchPerformance();
    await loadCustomerSegments();
}
