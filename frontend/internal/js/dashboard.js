// ---------------- API Helpers ----------------

async function apiGet(path) {
    try {
        const token = localStorage.getItem("internal_token");
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
    const token = localStorage.getItem("internal_token");
    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        let detail = `API error: ${response.status}`;
        try {
            const err = await response.json();
            detail = err.detail || detail;
        } catch (_) { /* response wasn't JSON */ }
        throw new Error(detail);
    }
    return await response.json();
}

// ---------------- Loaders ----------------

async function loadDashboard() {
    const data = await apiGet("/api/internal/dashboard/campaign-overview");
    if (!data) return;

    document.getElementById("active-count").textContent = data.active_campaigns;
    document.getElementById("inactive-count").textContent = data.inactive_campaigns;
    document.getElementById("total-count").textContent = data.total_campaigns;
}

async function loadCustomerSegments() {
    const data = await apiGet("/api/internal/dashboard/customer-segments");
    if (!data) return;

    document.getElementById("funnel-total").textContent = data.response_funnel.total_responses;
    document.getElementById("funnel-profiles").textContent = data.response_funnel.unique_profiles;
    document.getElementById("funnel-users").textContent = data.response_funnel.unique_users;

    const skinTypeBody = document.querySelector("#skin-type-table tbody");
    skinTypeBody.innerHTML = "";
    if (data.skin_type_breakdown.length === 0) {
        skinTypeBody.innerHTML = `<tr><td colspan="3">No skin profile data yet</td></tr>`;
    } else {
        data.skin_type_breakdown.forEach(s => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${s.skin_type}</td>
                <td>${s.response_count}</td>
                <td>${s.unique_users}</td>
            `;
            skinTypeBody.appendChild(row);
        });
    }

    const concernsBody = document.querySelector("#top-concerns-table tbody");
    concernsBody.innerHTML = "";
    if (data.top_concerns.length === 0) {
        concernsBody.innerHTML = `<tr><td colspan="2">No concern data yet</td></tr>`;
    } else {
        data.top_concerns.forEach(c => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${c.concern}</td>
                <td>${c.count}</td>
            `;
            concernsBody.appendChild(row);
        });
    }
}

async function loadAIInsights(forceRefresh = false) {
    const path = forceRefresh
        ? "/api/internal/dashboard/ai-insights?refresh=true"
        : "/api/internal/dashboard/ai-insights";
    const data = await apiGet(path);
    if (!data) return;

    const list = document.getElementById("ai-insights-list");
    list.innerHTML = "";
    data.insights.forEach(insight => {
        const li = document.createElement("li");
        li.textContent = insight;
        list.appendChild(li);
    });

    const generatedAt = new Date(data.generated_at * 1000);
    document.getElementById("insights-generated-at").textContent =
        `Generated ${generatedAt.toLocaleTimeString()}${data.cached ? " (cached)" : ""}`;
}

// ---------------- AI Campaign Generator ----------------

async function handleGenerateCampaign() {
    const product = document.getElementById("product").value;
    const audience = document.getElementById("audience").value;
    const goal = document.getElementById("goal").value;
    const output = document.getElementById("campaignOutput");
    const generateBtn = document.getElementById("generateBtn");

    if (!product || !audience || !goal) {
        output.innerHTML = "<p style='color:red;'>Please fill all fields.</p>";
        return;
    }

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";
    output.innerHTML = "<p>Generating campaign...</p>";

    try {
        const data = await apiPost("/campaign/generate", { product, audience, goal });

        output.innerHTML = `
            <div class="campaign-result">
                <h3>✨ AI Generated Campaign</h3>
                <div class="campaign-meta">
                    <p><strong>Product:</strong> ${data.product}</p>
                    <p><strong>Audience:</strong> ${data.audience}</p>
                    <p><strong>Goal:</strong> ${data.goal}</p>
                </div>
                <div class="campaign-content">
                    <pre>${data.campaign}</pre>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Campaign generation error:", error);
        output.innerHTML = `<p style='color:red;'>${error.message || "Unable to connect to backend."}</p>`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Campaign";
    }
}

// ---------------- Init ----------------

function initDashboard() {
    if (!requireAuth()) return; // redirect is in flight, stop here

    connectDashboardWS();
    loadDashboard();
    loadCustomerSegments();
    loadAIInsights();

    document.getElementById("refresh-insights-btn")
        .addEventListener("click", () => loadAIInsights(true));

    document.getElementById("generateBtn")
        .addEventListener("click", handleGenerateCampaign);
}

document.addEventListener("DOMContentLoaded", initDashboard);