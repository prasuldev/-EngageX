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

function getDashboardPreviewData() {
    const previewBanner = document.getElementById("preview-data-banner");
    if (previewBanner) previewBanner.hidden = false;

    return {
        campaignOverview: { active_campaigns: 2, inactive_campaigns: 1, total_campaigns: 3 },
        salesOverview: {
            total_customers: 59, total_orders: 34, revenue: 48600, active_campaigns: 2,
            recent_orders: [
                { order_id: 1208, customer: "Customer #1087", amount: 2400, status: "Delivered", date: "2026-09-01" },
                { order_id: 1207, customer: "Customer #1121", amount: 1850, status: "Shipped", date: "2026-08-31" },
                { order_id: 1206, customer: "Customer #1042", amount: 3200, status: "Confirmed", date: "2026-08-30" }
            ]
        },
        campaigns: [
            { id: 1, title: "Find Your Skin Twin", campaign_type: "skin_twin", is_active: true, participants: 52, total_responses: 32 },
            { id: 2, title: "Glow Routine Quiz", campaign_type: "quiz", is_active: true, participants: 38, total_responses: 11 },
            { id: 3, title: "Beauty Match Challenge", campaign_type: "memory_match", is_active: false, participants: 27, total_responses: 18 }
        ],
        beautyMatch: [
            { title: "Beauty Match Challenge", total_plays: 86, completions: 63, avg_moves: 14, avg_time_seconds: 48 }
        ],
        segments: {
            response_funnel: { total_responses: 86, unique_profiles: 44, unique_users: 39 },
            skin_type_breakdown: [
                { skin_type: "Combination", response_count: 31, unique_users: 17 },
                { skin_type: "Oily", response_count: 27, unique_users: 13 },
                { skin_type: "Dry", response_count: 18, unique_users: 9 }
            ],
            top_concerns: [
                { concern: "Acne", count: 29 }, { concern: "Dryness", count: 23 }, { concern: "Dark spots", count: 18 }
            ]
        },
        orders: [
            { id: 1208, full_name: "Customer #1087", created_at: "2026-09-01T10:30:00", status: "Delivered", total_amount: 2400, return_type: null, delivered_at: "2026-09-01T15:00:00" },
            { id: 1207, full_name: "Customer #1121", created_at: "2026-08-31T13:15:00", status: "Shipped", total_amount: 1850, return_type: null, delivered_at: null },
            { id: 1206, full_name: "Customer #1042", created_at: "2026-08-30T09:45:00", status: "Confirmed", total_amount: 3200, return_type: null, delivered_at: null }
        ]
    };
}

async function loadDashboard() {
    const liveData = await apiGet("/api/internal/dashboard/campaign-overview");
    const data = liveData?.total_campaigns ? liveData : getDashboardPreviewData().campaignOverview;

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
    const liveData = await apiGet("/api/internal/dashboard/sales-overview");
    const data = liveData?.total_orders ? liveData : getDashboardPreviewData().salesOverview;

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
    const liveData = await apiGet(
        "/api/internal/dashboard/campaign-performance"
    );
    const data = liveData?.length ? liveData : getDashboardPreviewData().campaigns;

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
    const liveData = await apiGet(
        "/api/internal/dashboard/beauty-match-performance"
    );
    const data = liveData?.length ? liveData : getDashboardPreviewData().beautyMatch;

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
    const liveData = await apiGet(
        "/api/internal/dashboard/customer-segments"
    );
    const data = liveData?.response_funnel?.total_responses
        ? liveData
        : getDashboardPreviewData().segments;

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

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatTrend(value, label) {
    if (value === null || value === undefined) return `No prior-week ${label} baseline`;
    const direction = value >= 0 ? "up" : "down";
    return `${direction} ${Math.abs(value).toFixed(1)}% vs previous week`;
}

let latestAISalesData = null;

function buildDemoHistory() {
    return Array.from({ length: 30 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - index));
        return { date: date.toISOString().slice(0, 10), revenue: 3200 + index * 95 + (index % 5) * 240, orders: 3 + (index % 6) };
    });
}

function getAISalesPreviewData() {
    return {
        preview: true,
        generated_at: new Date().toISOString(),
        insights: [
            "Serum demand is growing; pair the leading serum with a cleanser to increase average order value.",
            "Seven at-risk customers should receive a personalized win-back offer this week.",
            "Beauty Match recommendations are converting best when customers view the matched product immediately."
        ],
        forecast: { next_7_days_revenue: 48600, next_7_days_orders: 34, revenue_change_percent: 12.4, order_change_percent: 8.1, method: "Demo 30-day trend" },
        sales_history: buildDemoHistory(),
        sales_summary: { today_revenue: 5950, today_orders: 8, current_7_days_revenue: 36400, previous_7_days_revenue: 32384, current_7_days_orders: 49, previous_7_days_orders: 45 },
        customer_segments: { high_value: 18, frequent_buyers: 27, at_risk: 7, never_purchased: 21 },
        churn_risk_summary: { high: 7, medium: 14, low: 38 },
        beauty_match_conversion: {
            recommendations: 86, views: 63, cart_adds: 29, purchases: 17, attributed_revenue: 22150,
            top_products: [
                { name: "Hydrating Barrier Serum", recommendations: 28, cart_adds: 12, purchases: 8 },
                { name: "Gentle Gel Cleanser", recommendations: 22, cart_adds: 9, purchases: 5 }
            ]
        },
        product_opportunities: [
            { name: "Hydrating Barrier Serum", units: 42, revenue: 31500, recent_units: 21, previous_units: 16, momentum_percent: 31.2, action: "Increase visibility and use as a cross-sell anchor." },
            { name: "Gentle Gel Cleanser", units: 35, revenue: 18900, recent_units: 18, previous_units: 16, momentum_percent: 14.8, action: "Bundle with the leading serum." },
            { name: "Mineral Sunscreen SPF 50", units: 19, revenue: 17100, recent_units: 11, previous_units: 12, momentum_percent: -8.3, action: "Test placement beside daytime routines." }
        ],
        bundle_recommendations: [
            { product_a: "Hydrating Barrier Serum", product_b: "Gentle Gel Cleanser", orders_together: 14, bundle_revenue: 19600, action: "Test a 10% routine bundle." },
            { product_a: "Vitamin C Essence", product_b: "Mineral Sunscreen SPF 50", orders_together: 9, bundle_revenue: 15300, action: "Promote as a morning glow duo." }
        ],
        customer_next_best_actions: [
            { name: "Customer #1042", segment: "At risk", churn_risk: "High", churn_risk_score: 82, inactive_days: 76, next_best_action: "Send a personalized win-back offer with a 72-hour expiry." },
            { name: "Customer #1087", segment: "High value", churn_risk: "Low", churn_risk_score: 18, inactive_days: 9, next_best_action: "Recommend a premium serum and cleanser bundle." },
            { name: "Customer #1121", segment: "Frequent buyer", churn_risk: "Medium", churn_risk_score: 46, inactive_days: 38, next_best_action: "Send a replenishment reminder based on the last purchase." }
        ],
        customer_journey: {
            period: "demo_preview",
            summary: { views: 148, cart_adds: 61, wishlists: 37, purchases: 29, active_customers: 83 },
            recent_activity: [
                { customer_name: "Customer #1087", activity_type: "purchase", product_name: "Hydrating Barrier Serum", created_at: new Date().toISOString() },
                { customer_name: "Customer #1042", activity_type: "cart_add", product_name: "Mineral Sunscreen SPF 50", created_at: new Date(Date.now() - 18 * 60000).toISOString() },
                { customer_name: "Customer #1121", activity_type: "wishlist_add", product_name: "Gentle Gel Cleanser", created_at: new Date(Date.now() - 65 * 60000).toISOString() },
                { customer_name: "Customer #1154", activity_type: "product_view", product_name: "Vitamin C Essence", created_at: new Date(Date.now() - 3 * 3600000).toISOString() }
            ]
        },
        campaign_actions: [
            { title: "Find Your Skin Twin", response_rate: 61.5, participants: 52, action: "Scale this format and reuse its audience targeting.", experiment: { hypothesis: "Leading with the reward will raise response rate.", variant_b: "Show the reward before the first question.", primary_metric: "Response rate", minimum_sample: 104 } },
            { title: "Glow Routine Quiz", response_rate: 28.4, participants: 38, action: "Simplify the interaction and strengthen the call to action.", experiment: { hypothesis: "A shorter quiz will improve completion.", variant_b: "Reduce the quiz to three questions.", primary_metric: "Completion rate", minimum_sample: 80 } }
        ],
        anomalies: [{ severity: "opportunity", metric: "revenue", title: "Revenue increased 12.4%", detail: "Compared with the previous seven days." }]
    };
}

function estimatedMetricHistory(metric, data) {
    const forecast = data.forecast || {};
    const change = Number(forecast[metric === "revenue" ? "revenue_change_percent" : "order_change_percent"] || 0);
    const weeklyForecast = Number(forecast[metric === "revenue" ? "next_7_days_revenue" : "next_7_days_orders"] || 0);
    const dailyBase = Math.max(metric === "revenue" ? 100 : 1, weeklyForecast / 7);
    return Array.from({ length: 30 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - index));
        const progress = index / 29;
        const slope = (change / 100) * (progress - .5);
        const naturalMovement = Math.sin(index * 1.7) * .12 + Math.cos(index * .63) * .07;
        return { date: date.toISOString().slice(0, 10), [metric]: Math.max(0, dailyBase * (1 + slope + naturalMovement)) };
    });
}

function marketChartSVG(history, metric, estimated = false) {
    const width = 900, height = 300, left = 66, right = 24, top = 24, bottom = 42;
    const values = history.map(day => Number(day[metric] || 0));
    const max = Math.max(...values, 1), min = Math.min(...values, 0), range = max - min || 1;
    const x = index => left + (index / Math.max(1, values.length - 1)) * (width - left - right);
    const y = value => top + (1 - (value - min) / range) * (height - top - bottom);
    const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
    const area = `${left},${height-bottom} ${points} ${width-right},${height-bottom}`;
    const rising = values.at(-1) >= values[0];
    const color = rising ? "#22a06b" : "#e05260";
    const gradientId = `market-${metric}-${rising ? "up" : "down"}`;
    const grid = Array.from({ length: 5 }, (_, index) => {
        const gy = top + index * (height - top - bottom) / 4;
        const value = max - index * range / 4;
        const label = metric === "revenue" ? `₹${Math.round(value).toLocaleString("en-IN")}` : Math.round(value).toLocaleString();
        return `<line class="market-grid" x1="${left}" y1="${gy}" x2="${width-right}" y2="${gy}"></line><text class="market-axis" x="${left-9}" y="${gy+4}" text-anchor="end">${label}</text>`;
    }).join("");
    const dateLabels = [0, Math.floor((history.length - 1) / 2), history.length - 1].map(index => `<text class="market-axis" x="${x(index)}" y="${height-12}" text-anchor="middle">${new Date(history[index].date).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</text>`).join("");
    const pointsMarkup = values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="3" style="--point-color:${color}"><title>${new Date(history[index].date).toLocaleDateString()}: ${metric === "revenue" ? `₹${value.toLocaleString("en-IN",{maximumFractionDigits:0})}` : value.toLocaleString(undefined,{maximumFractionDigits:1})}</title></circle>`).join("");
    return `<div class="ai-market-chart-wrap"><div class="ai-market-legend"><span><i style="background:${color}"></i>${rising ? "Upward" : "Downward"} ${estimated ? "estimated" : "actual"} trend</span><strong style="color:${color}">${rising ? "▲" : "▼"} ${metric === "revenue" ? "Revenue" : "Orders"}</strong></div><svg class="ai-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric} market-style flow chart"><defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"></stop><stop offset="1" stop-color="${color}" stop-opacity="0"></stop></linearGradient></defs>${grid}<polygon points="${area}" fill="url(#${gradientId})"></polygon><polyline points="${points}" style="stroke:${color}"></polyline>${pointsMarkup}${dateLabels}</svg>${estimated ? '<p class="ai-estimate-note">Estimated visualization from the available forecast because daily history is not yet returned by the deployed API.</p>' : ""}</div>`;
}

function showOverviewReport(metric) {
    if (!latestAISalesData) return;
    const report = document.getElementById("ai-overview-report");
    const rawHistory = latestAISalesData.sales_history || [];
    const summary = latestAISalesData.sales_summary || {};
    const forecast = latestAISalesData.forecast || {};
    const isRevenue = metric !== "orders";
    const metricKey = isRevenue ? "revenue" : "orders";
    const estimated = rawHistory.length < 2;
    const history = estimated ? estimatedMetricHistory(metricKey, latestAISalesData) : rawHistory;
    const fallbackCurrent = history.slice(-7).reduce((total, day) => total + Number(day[metricKey] || 0), 0);
    const current = Number(summary[isRevenue ? "current_7_days_revenue" : "current_7_days_orders"] ?? fallbackCurrent);
    const previousFromChange = change => change === -100 ? 0 : current / (1 + change / 100);
    const change = forecast[isRevenue ? "revenue_change_percent" : "order_change_percent"];
    const previous = Number(summary[isRevenue ? "previous_7_days_revenue" : "previous_7_days_orders"] ?? previousFromChange(Number(change || 0)));
    const formatValue = value => isRevenue ? `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : Math.round(Number(value)).toLocaleString();
    report.innerHTML = `<div class="ai-report-head"><div><p class="eyebrow">Full detail report</p><h2>${isRevenue ? "Revenue" : "Order volume"} flow</h2><p>Daily movement across the last 30 days and a direct seven-day comparison.</p></div><button type="button" class="ai-report-close" aria-label="Close report">×</button></div>
        ${marketChartSVG(history, metricKey, estimated)}
        <div class="ai-report-comparison"><div><span>Previous 7 days</span><strong>${formatValue(previous)}</strong></div><i class="fa-solid fa-arrow-right"></i><div><span>Current 7 days</span><strong>${formatValue(current)}</strong></div><div class="ai-report-change ${Number(change) < 0 ? "negative" : "positive"}"><span>Change</span><strong>${change == null ? "No baseline" : `${change >= 0 ? "+" : ""}${Number(change).toFixed(1)}%`}</strong></div></div>
        <div class="ai-report-note"><strong>What happened?</strong><span>${current > previous ? `${isRevenue ? "Revenue" : "Orders"} increased in the latest period.` : current < previous ? `${isRevenue ? "Revenue" : "Orders"} decreased in the latest period and needs attention.` : "Performance remained level."}</span></div>`;
    report.hidden = false;
    report.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showProductReport(index) {
    const product = latestAISalesData?.product_opportunities?.[index];
    if (!product) return;
    const report = document.getElementById("ai-product-report");
    const previous = Number(product.previous_units || 0);
    const recent = Number(product.recent_units || 0);
    const previousDate = new Date(); previousDate.setDate(previousDate.getDate() - 30);
    const currentDate = new Date();
    report.innerHTML = `<div class="ai-report-head"><div><p class="eyebrow">Product performance report</p><h2>${escapeHTML(product.name)}</h2><p>Where the sales movement happened and what to do next.</p></div><button type="button" class="ai-report-close" aria-label="Close report">×</button></div>
        ${marketChartSVG([{date:previousDate.toISOString().slice(0,10),orders:previous},{date:currentDate.toISOString().slice(0,10),orders:recent}], "orders")}
        <div class="ai-report-comparison"><div><span>Previous 30 days</span><strong>${previous} units</strong></div><i class="fa-solid fa-arrow-right"></i><div><span>Latest 30 days</span><strong>${recent} units</strong></div><div class="ai-report-change ${Number(product.momentum_percent) < 0 ? "negative" : "positive"}"><span>Momentum</span><strong>${product.momentum_percent == null ? "New" : `${Number(product.momentum_percent).toFixed(1)}%`}</strong></div></div>
        <div class="ai-report-note"><strong>${Number(product.momentum_percent) < 0 ? "Issue detected" : "Growth opportunity"}</strong><span>${escapeHTML(product.action)}</span></div>`;
    report.hidden = false;
    report.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showBeautyReport() {
    const beauty = latestAISalesData?.beauty_match_conversion || {};
    const game = beauty.original_game || {};
    if (Number(game.total_plays || 0) > 0) {
        const plays = Number(game.total_plays || 0);
        const completions = Number(game.completions || 0);
        const incomplete = Math.max(0, plays - completions);
        const completionRate = plays ? completions / plays * 100 : 0;
        const report = document.getElementById("ai-beauty-report");
        report.innerHTML = `<div class="ai-report-head"><div><p class="eyebrow">Original Beauty Match data</p><h2>Beauty Match game flow</h2><p>Actual plays and completions recorded by the original Beauty Match campaign.</p></div><button type="button" class="ai-report-close" aria-label="Close report">×</button></div>
            <div class="ai-conversion-flow"><div><span>Total plays</span><strong>${plays}</strong><small>All recorded game sessions</small></div><i class="fa-solid fa-arrow-right"></i><div><span>Completed games</span><strong>${completions}</strong><small>${completionRate.toFixed(1)}% completion rate</small></div><i class="fa-solid fa-arrow-right"></i><div><span>Incomplete games</span><strong>${incomplete}</strong><small>${plays ? (incomplete / plays * 100).toFixed(1) : "0.0"}% drop-off</small></div></div>
            <div class="ai-report-comparison"><div><span>Average moves</span><strong>${Number(game.avg_moves || 0)}</strong></div><div><span>Average completion time</span><strong>${Number(game.avg_time_seconds || 0)} sec</strong></div><div><span>Unique players</span><strong>${Number(game.unique_players || 0) || "—"}</strong></div><div><span>Rewards issued</span><strong>${Number(game.rewards_issued || 0) || "—"}</strong></div></div>
            <div class="ai-report-note"><strong>Original campaign result</strong><span>${completionRate >= 60 ? "Beauty Match has a healthy completion rate. Test stronger product follow-through after completion." : "Beauty Match is losing players before completion. Review game difficulty, number of pairs, and reward visibility."}</span></div>`;
        report.hidden = false;
        report.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
    }
    const recommendations = Number(beauty.recommendations || 0);
    const stages = [recommendations, Number(beauty.views || 0), Number(beauty.cart_adds || 0), Number(beauty.purchases || 0)];
    const labels = ["Recommendations", "Views", "Cart adds", "Purchases"];
    const report = document.getElementById("ai-beauty-report");
    report.innerHTML = `<div class="ai-report-head"><div><p class="eyebrow">Beauty Match report</p><h2>Recommendation conversion flow</h2><p>Shows exactly where customers continue or drop from the journey.</p></div><button type="button" class="ai-report-close" aria-label="Close report">×</button></div>
        <div class="ai-conversion-flow">${stages.map((value, index) => { const rate = index === 0 ? 100 : (recommendations ? value / recommendations * 100 : 0); const prior = index ? stages[index - 1] : value; const drop = index ? (prior ? (prior - value) / prior * 100 : 0) : 0; return `<div><span>${labels[index]}</span><strong>${value}</strong><small>${rate.toFixed(1)}% of matches${index ? ` · ${drop.toFixed(1)}% step drop` : ""}</small></div>${index < stages.length - 1 ? '<i class="fa-solid fa-arrow-right"></i>' : ""}`; }).join("")}</div>
        <div class="ai-report-note"><strong>Sales result</strong><span>₹${Number(beauty.attributed_revenue || 0).toLocaleString("en-IN")} attributed revenue within ${beauty.attribution_window_days || 30} days. ${stages[2] > stages[3] ? "The largest immediate opportunity is converting more cart additions into purchases." : "The funnel is converting consistently."}</span></div>`;
    report.hidden = false;
    report.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showCampaignReport(index) {
    const campaign = latestAISalesData?.campaign_actions?.[index];
    if (!campaign) return;
    if (campaign.title.toLowerCase().includes("beauty match")) {
        showBeautyReport();
        return;
    }
    const report = document.getElementById("ai-beauty-report");
    const participants = Number(campaign.participants || 0);
    const responseRate = Math.min(100, Number(campaign.response_rate || 0));
    const responses = Number(campaign.responses ?? Math.round(participants * responseRate / 100));
    const nonResponses = Math.max(0, participants - responses);
    report.innerHTML = `<div class="ai-report-head"><div><p class="eyebrow">Campaign performance report</p><h2>${escapeHTML(campaign.title)}</h2><p>Participation, response conversion, and the recommended optimization.</p></div><button type="button" class="ai-report-close" aria-label="Close report">×</button></div>
        <div class="ai-conversion-flow"><div><span>Participants</span><strong>${participants}</strong><small>100% campaign reach</small></div><i class="fa-solid fa-arrow-right"></i><div><span>Responses</span><strong>${responses}</strong><small>${responseRate.toFixed(1)}% response rate</small></div><i class="fa-solid fa-arrow-right"></i><div><span>Did not respond</span><strong>${nonResponses}</strong><small>${participants ? (nonResponses / participants * 100).toFixed(1) : "0.0"}% drop-off</small></div></div>
        <div class="ai-report-note"><strong>Recommended optimization</strong><span>${escapeHTML(campaign.action)}</span></div>`;
    report.hidden = false;
    report.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function loadAISalesIntelligence() {
    const data = await apiGet("/api/internal/dashboard/ai-sales-intelligence") || getAISalesPreviewData();
    if (!data) {
        document.getElementById("ai-sales-generated-at").textContent =
            "Sales intelligence is temporarily unavailable.";
        return;
    }
    const beauty = data.beauty_match_conversion || (data.beauty_match_conversion = {});
    if (!beauty.original_game || Number(beauty.original_game.total_plays || 0) === 0) {
        const originalRows = await apiGet("/api/internal/dashboard/beauty-match-performance");
        if (Array.isArray(originalRows) && originalRows.length) {
            const totalPlays = originalRows.reduce((sum, row) => sum + Number(row.total_plays || 0), 0);
            beauty.original_game = {
                total_plays: totalPlays,
                completions: originalRows.reduce((sum, row) => sum + Number(row.completions || 0), 0),
                avg_moves: Math.round(originalRows.reduce((sum, row) => sum + Number(row.avg_moves || 0) * Number(row.total_plays || 0), 0) / Math.max(1, totalPlays)),
                avg_time_seconds: Math.round(originalRows.reduce((sum, row) => sum + Number(row.avg_time_seconds || 0) * Number(row.total_plays || 0), 0) / Math.max(1, totalPlays)),
            };
        }
    }
    latestAISalesData = data;

    const forecast = data.forecast || {};
    document.getElementById("ai-forecast-revenue").textContent =
        `₹${Number(forecast.next_7_days_revenue || 0).toLocaleString("en-IN")}`;
    document.getElementById("ai-forecast-orders").textContent =
        Number(forecast.next_7_days_orders || 0).toLocaleString();
    document.getElementById("ai-revenue-trend").textContent =
        formatTrend(forecast.revenue_change_percent, "revenue");
    document.getElementById("ai-order-trend").textContent =
        formatTrend(forecast.order_change_percent, "order");

    const insights = data.insights || [];
    document.getElementById("ai-growth-insights").innerHTML = insights.length
        ? insights.map(item => `<li class="ai-insight-trigger" data-report="${item.toLowerCase().includes("order") ? "orders" : "revenue"}">${escapeHTML(item)}<span>View report →</span></li>`).join("")
        : `<li>More sales data is needed to generate growth insights.</li>`;

    const segments = data.customer_segments || {};
    const segmentLabels = [
        ["high_value", "High-value", "Reward loyalty and cross-sell premium products."],
        ["frequent_buyers", "Frequent buyers", "Offer bundles and replenishment reminders."],
        ["at_risk", "At risk", "Run a personalized win-back campaign."],
        ["never_purchased", "No purchase yet", "Use a first-order incentive."],
    ];
    document.getElementById("ai-customer-segments").innerHTML = segmentLabels
        .map(([key, label, action]) => `
            <div class="ai-segment-card">
                <strong>${Number(segments[key] || 0).toLocaleString()}</strong>
                <span>${label}</span>
                <small>${action}</small>
            </div>
        `).join("");

    const originalGame = beauty.original_game || {};
    const beautySteps = Number(originalGame.total_plays || 0) > 0 ? [
        ["Game plays", originalGame.total_plays || 0],
        ["Completions", originalGame.completions || 0],
        ["Average moves", originalGame.avg_moves || 0],
        ["Average time", `${Number(originalGame.avg_time_seconds || 0)} sec`],
    ] : [
        ["Matches", beauty.recommendations || 0],
        ["Product views", beauty.views || 0],
        ["Cart adds", beauty.cart_adds || 0],
        ["Purchases", beauty.purchases || 0],
        ["Attributed revenue", `₹${Number(beauty.attributed_revenue || 0).toLocaleString("en-IN")}`],
    ];
    document.getElementById("ai-beauty-funnel").innerHTML = beautySteps
        .map(([label, value], index) => `
            <div class="ai-funnel-step">
                <span>${escapeHTML(label)}</span>
                <strong>${escapeHTML(value)}</strong>
                ${index < beautySteps.length - 1 ? '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>' : ""}
            </div>
        `).join("");

    const beautyProducts = beauty.top_products || [];
    document.querySelector("#ai-beauty-products tbody").innerHTML = beautyProducts.length
        ? beautyProducts.map(product => `
            <tr>
                <td>${escapeHTML(product.name)}</td>
                <td>${Number(product.recommendations || 0).toLocaleString()}</td>
                <td>${Number(product.cart_adds || 0).toLocaleString()}</td>
                <td>${Number(product.purchases || 0).toLocaleString()}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">No Beauty Match recommendations tracked yet.</td></tr>`;

    const products = data.product_opportunities || [];
    document.querySelector("#ai-product-opportunities tbody").innerHTML = products.length
        ? products.map((product, index) => `
            <tr class="ai-product-trigger" data-product-index="${index}" tabindex="0">
                <td>${escapeHTML(product.name)}</td>
                <td>${Number(product.units || 0).toLocaleString()}</td>
                <td>₹${Number(product.revenue || 0).toLocaleString("en-IN")}</td>
                <td>${product.momentum_percent === null ? "New" : `${Number(product.momentum_percent).toFixed(1)}%`}</td>
                <td>${escapeHTML(product.action)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="5">No completed product sales yet.</td></tr>`;

    const bundles = data.bundle_recommendations || [];
    document.querySelector("#ai-bundle-recommendations tbody").innerHTML = bundles.length
        ? bundles.map(bundle => `<tr>
            <td>${escapeHTML(bundle.product_a)} + ${escapeHTML(bundle.product_b)}</td>
            <td>${Number(bundle.orders_together).toLocaleString()}</td>
            <td>₹${Number(bundle.bundle_revenue).toLocaleString("en-IN")}</td>
            <td>${escapeHTML(bundle.action)}</td>
        </tr>`).join("")
        : `<tr><td colspan="4">More multi-product orders are needed to identify bundles.</td></tr>`;

    const churn = data.churn_risk_summary || {};
    document.getElementById("ai-churn-summary").innerHTML = [
        ["High risk", churn.high || 0], ["Medium risk", churn.medium || 0], ["Low risk", churn.low || 0]
    ].map(([label, value]) => `<div class="ai-segment-card"><strong>${value}</strong><span>${label}</span></div>`).join("");

    const customerActions = data.customer_next_best_actions || [];
    document.querySelector("#ai-customer-actions tbody").innerHTML = customerActions.length
        ? customerActions.map(customer => `<tr>
            <td>${escapeHTML(customer.name)}</td><td>${escapeHTML(customer.segment)}</td>
            <td><span class="ai-risk ai-risk--${customer.churn_risk.toLowerCase()}">${customer.churn_risk} · ${customer.churn_risk_score}</span></td>
            <td>${customer.inactive_days} days</td><td>${escapeHTML(customer.next_best_action)}</td>
        </tr>`).join("")
        : `<tr><td colspan="5">No customer behavior is available yet.</td></tr>`;

    const journey = data.customer_journey || {};
    const journeySummary = journey.summary || {};
    const journeyMetrics = [
        ["Product views", journeySummary.views || 0],
        ["Cart adds", journeySummary.cart_adds || 0],
        ["Wishlisted", journeySummary.wishlists || 0],
        ["Purchased", journeySummary.purchases || 0],
        ["Active customers", journeySummary.active_customers || 0]
    ];
    document.getElementById("ai-journey-summary").innerHTML = journeyMetrics
        .map(([label, value]) => `<div class="ai-journey-metric"><strong>${Number(value).toLocaleString()}</strong><span>${label}</span></div>`)
        .join("");

    const activityLabels = {
        product_view: "Viewed product",
        cart_add: "Added to cart",
        wishlist_add: "Wishlisted",
        purchase: "Purchased"
    };
    const activitySignals = {
        product_view: "Interest detected — retarget if the customer does not continue.",
        cart_add: "High intent — send a timely cart reminder.",
        wishlist_add: "Saved interest — consider a stock or offer notification.",
        purchase: "Converted — recommend a complementary or replenishment product."
    };
    const journeyActivity = journey.recent_activity || [];
    document.querySelector("#ai-customer-journey tbody").innerHTML = journeyActivity.length
        ? journeyActivity.map(item => {
            const activity = activityLabels[item.activity_type] ? item.activity_type : "product_view";
            const occurredAt = new Date(item.created_at);
            return `<tr>
                <td>${escapeHTML(item.customer_name || "Customer")}</td>
                <td><span class="ai-activity-badge ai-activity--${activity}">${activityLabels[activity]}</span></td>
                <td>${escapeHTML(item.product_name || "Product")}</td>
                <td>${Number.isNaN(occurredAt.getTime()) ? "—" : occurredAt.toLocaleString()}</td>
                <td>${activitySignals[activity]}</td>
            </tr>`;
        }).join("")
        : `<tr><td colspan="5">No view, cart, wishlist, or purchase activity has been recorded yet.</td></tr>`;

    const campaigns = data.campaign_actions || [];
    document.getElementById("ai-campaign-actions").innerHTML = campaigns.length
        ? campaigns.map((campaign, index) => `
            <li class="ai-campaign-trigger" data-campaign-index="${index}" tabindex="0">
                <strong>${escapeHTML(campaign.title)}</strong>
                <span>${Math.min(100, Number(campaign.response_rate || 0))}% response rate · ${escapeHTML(campaign.action)}</span>
                <span>View campaign flow →</span>
            </li>
        `).join("")
        : `<li>No active campaigns are available to optimize.</li>`;

    document.querySelector("#ai-experiment-plans tbody").innerHTML = campaigns.length
        ? campaigns.map(campaign => `<tr>
            <td>${escapeHTML(campaign.title)}</td>
            <td>${escapeHTML(campaign.experiment.hypothesis)}</td>
            <td>${escapeHTML(campaign.experiment.variant_b)}</td>
            <td>${escapeHTML(campaign.experiment.primary_metric)}</td>
            <td>${Number(campaign.experiment.minimum_sample).toLocaleString()}</td>
        </tr>`).join("")
        : `<tr><td colspan="5">No active campaigns are available for experiments.</td></tr>`;

    const anomalies = data.anomalies || [];
    document.getElementById("ai-anomaly-alerts").innerHTML = anomalies
        .map(alert => `
            <li class="ai-alert ai-alert--${escapeHTML(alert.severity)} ai-anomaly-trigger" data-report="${escapeHTML(alert.metric === "orders" ? "orders" : "revenue")}">
                <strong>${escapeHTML(alert.title)}</strong>
                <span>${escapeHTML(alert.detail)}</span>
                <span>View full report →</span>
            </li>
        `).join("");

    const generatedAt = new Date(data.generated_at);
    document.getElementById("ai-sales-generated-at").textContent =
        `${data.preview ? "Demo preview" : `Updated ${generatedAt.toLocaleString()}`} · ${forecast.method || "sales trend"}`;
}

function initAITabs() {
    const tabs = document.querySelectorAll(".ai-tab");
    const panels = document.querySelectorAll(".ai-tab-panel");
    tabs.forEach(tab => tab.addEventListener("click", () => {
        tabs.forEach(item => item.classList.toggle("active", item === tab));
        panels.forEach(panel => panel.classList.toggle("active", panel.dataset.aiPanel === tab.dataset.aiTab));
    }));
}

function initAIReports() {
    const intelligencePanel = document.getElementById("panel-intelligence");
    intelligencePanel.addEventListener("click", event => {
        const reportTrigger = event.target.closest("[data-report]");
        if (reportTrigger) showOverviewReport(reportTrigger.dataset.report);
        const productTrigger = event.target.closest(".ai-product-trigger");
        if (productTrigger) showProductReport(Number(productTrigger.dataset.productIndex));
        const campaignTrigger = event.target.closest(".ai-campaign-trigger");
        if (campaignTrigger) showCampaignReport(Number(campaignTrigger.dataset.campaignIndex));
        if (event.target.closest("#ai-beauty-funnel")) showBeautyReport();
        const close = event.target.closest(".ai-report-close");
        if (close) close.closest(".ai-detail-report").hidden = true;
    });
    intelligencePanel.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && event.target.matches(".ai-product-trigger, .ai-campaign-trigger")) {
            event.preventDefault();
            if (event.target.matches(".ai-product-trigger")) showProductReport(Number(event.target.dataset.productIndex));
            else showCampaignReport(Number(event.target.dataset.campaignIndex));
        }
    });
    document.querySelectorAll(".ai-question-suggestions button").forEach(button => {
        button.addEventListener("click", () => {
            document.getElementById("ai-sales-question").value = button.textContent;
            document.getElementById("ai-sales-question-form").requestSubmit();
        });
    });
}

async function handleSalesQuestion(event) {
    event.preventDefault();
    const input = document.getElementById("ai-sales-question");
    const answer = document.getElementById("ai-sales-answer");
    answer.textContent = "Analyzing current dashboard data…";
    try {
        const data = await apiPost("/api/internal/dashboard/ai-sales-assistant", { question: input.value.trim() });
        answer.innerHTML = `<strong>${escapeHTML(data.answer)}</strong><small>Evidence: ${(data.evidence || []).map(escapeHTML).join(" · ")}</small>`;
    } catch (error) {
        const question = input.value.toLowerCase();
        if (question.includes("today") && (question.includes("sale") || question.includes("revenue") || question.includes("order"))) {
            answer.innerHTML = `<strong>Demo preview: Today's recorded sales are ₹5,950 from 8 orders.</strong><small>Evidence: demo daily sales data</small>`;
        } else if (question.includes("bundle")) {
            answer.innerHTML = `<strong>Demo preview: Bundle Hydrating Barrier Serum with Gentle Gel Cleanser; they appeared together in 14 orders.</strong><small>Evidence: demo product-affinity data</small>`;
        } else if (question.includes("churn") || question.includes("customer")) {
            answer.innerHTML = `<strong>Demo preview: Prioritize the 7 high-risk customers with personalized 72-hour win-back offers.</strong><small>Evidence: demo recency and frequency scores</small>`;
        } else if (/sale|revenue|order|product|promote|growth|campaign|beauty|forecast/.test(question)) {
            answer.innerHTML = `<strong>Demo preview: Promote Hydrating Barrier Serum first and cross-sell Gentle Gel Cleanser.</strong><small>Evidence: demo sales momentum and bundle data</small>`;
        } else {
            answer.innerHTML = `<strong>I am the EngageX sales assistant, so I can only answer questions about sales, revenue, orders, products, customers, Beauty Match, and campaigns.</strong><small>Evidence: sales-only assistant policy</small>`;
        }
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

            if (targetId === "panel-intelligence") {
                await loadAISalesIntelligence();
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
    initAITabs();
    initAIReports();
    initOrdersPanel();
    connectDashboardWS();
    setupNavigation();

    document.getElementById("refresh-insights-btn")
        .addEventListener("click", () => loadAIInsights(true));
    document.getElementById("generateBtn")
        .addEventListener("click", handleGenerateCampaign);
    document.getElementById("refresh-sales-ai-btn")
        .addEventListener("click", loadAISalesIntelligence);
    document.getElementById("ai-sales-question-form")
        .addEventListener("submit", handleSalesQuestion);

    await loadDashboard();
    await loadSalesOverview();
    await loadCampaignPerformance();
    await loadBeautyMatchPerformance();
    await loadCustomerSegments();
    await loadAIInsights();
    await loadAISalesIntelligence();
}
