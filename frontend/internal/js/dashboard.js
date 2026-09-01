document.addEventListener("DOMContentLoaded", initDashboard);

async function apiGet(path) {
    try {
        const token = getInternalToken();
        const response = await fetch(`${API_BASE}${path}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("apiGet error:", error);
        return null;
    }
}

async function apiPost(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getInternalToken()}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        let detail = `API error: ${response.status}`;
        try {
            const error = await response.json();
            detail = error.detail || detail;
        } catch (_) { /* response was not JSON */ }
        throw new Error(detail);
    }

    return await response.json();
}

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

    const funnel = data.response_funnel || {};
    document.getElementById("funnel-total").textContent = funnel.total_responses || 0;
    document.getElementById("funnel-profiles").textContent = funnel.unique_profiles || 0;
    document.getElementById("funnel-users").textContent = funnel.unique_users || 0;

    const skinTypes = data.skin_type_breakdown || [];
    document.querySelector("#skin-type-table tbody").innerHTML = skinTypes.length
        ? skinTypes.map(item => `
            <tr>
                <td>${item.skin_type || "—"}</td>
                <td>${item.response_count || 0}</td>
                <td>${item.unique_users || 0}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">No skin profile data yet</td></tr>`;

    const concerns = data.top_concerns || [];
    document.querySelector("#top-concerns-table tbody").innerHTML = concerns.length
        ? concerns.map(item => `
            <tr><td>${item.concern || "—"}</td><td>${item.count || 0}</td></tr>
        `).join("")
        : `<tr><td colspan="2">No concern data yet</td></tr>`;
}

async function loadAIInsights(forceRefresh = false) {
    const path = forceRefresh
        ? "/api/internal/dashboard/ai-insights?refresh=true"
        : "/api/internal/dashboard/ai-insights";
    const data = await apiGet(path);

    if (!data) return;

    const list = document.getElementById("ai-insights-list");
    const insights = data.insights || [];
    list.innerHTML = insights.length
        ? insights.map(insight => `<li>${insight}</li>`).join("")
        : `<li>No AI insights available.</li>`;

    if (data.generated_at) {
        const generatedAt = new Date(data.generated_at * 1000);
        document.getElementById("insights-generated-at").textContent =
            `Generated ${generatedAt.toLocaleTimeString()}${data.cached ? " (cached)" : ""}`;
    }
}

async function handleGenerateCampaign() {
    const product = document.getElementById("product").value.trim();
    const audience = document.getElementById("audience").value.trim();
    const goal = document.getElementById("goal").value.trim();
    const output = document.getElementById("campaignOutput");
    const button = document.getElementById("generateBtn");

    if (!product || !audience || !goal) {
        output.innerHTML = `<p class="empty-state">Please fill all fields.</p>`;
        return;
    }

    button.disabled = true;
    button.textContent = "Generating...";

    try {
        const data = await apiPost("/campaign/generate", { product, audience, goal });
        output.innerHTML = `
            <div class="campaign-result">
                <h3>AI Generated Campaign</h3>
                <pre>${data.campaign || "No campaign returned."}</pre>
            </div>
        `;
    } catch (error) {
        output.innerHTML = `<p class="empty-state">${error.message}</p>`;
    } finally {
        button.disabled = false;
        button.textContent = "Generate campaign";
    }
}

function applyTheme(theme) {
    const resolvedTheme = theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme;
    document.documentElement.setAttribute("data-theme", resolvedTheme);
}

function initTheme() {
    const select = document.getElementById("theme-select");
    const savedTheme = localStorage.getItem("engagex_theme") || "system";
    select.value = savedTheme;
    applyTheme(savedTheme);

    select.addEventListener("change", event => {
        localStorage.setItem("engagex_theme", event.target.value);
        applyTheme(event.target.value);
    });

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if ((localStorage.getItem("engagex_theme") || "system") === "system") {
            applyTheme("system");
        }
    });
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
    if (!requireAuth()) return;
    if (!requireRole(["marketing_manager"])) return;

    const user = getInternalUser();
    const greeting = document.getElementById("user-greeting");
    if (greeting && user) greeting.textContent = user.full_name;

    initTheme();
    initOrdersPanel();
    connectDashboardWS();
    setupNavigation();

    document.getElementById("refresh-insights-btn")
        .addEventListener("click", () => loadAIInsights(true));
    document.getElementById("generateBtn")
        .addEventListener("click", handleGenerateCampaign);

    await loadDashboard();
    await loadSalesOverview();
    await loadCampaignPerformance();
    await loadBeautyMatchPerformance();
    await loadCustomerSegments();
    await loadAIInsights();
}
