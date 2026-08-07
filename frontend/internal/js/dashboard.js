requireAuth();
connectDashboardWS();

const user = getInternalUser();
document.getElementById("user-greeting").textContent = `${user.full_name} (${user.role})`;
document.getElementById("logout-btn").addEventListener("click", logout);

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getInternalToken()}` }
  });
  if (res.status === 401 || res.status === 403) {
    logout();
    return null;
  }
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

async function loadOverview() {
  const data = await apiGet("/api/internal/dashboard/campaign-overview");
  if (!data) return;
  document.getElementById("active-count").textContent = data.active_campaigns;
  document.getElementById("inactive-count").textContent = data.inactive_campaigns;
  document.getElementById("total-count").textContent = data.total_campaigns;
}

async function loadPerformance() {
  const data = await apiGet("/api/internal/dashboard/campaign-performance");
  if (!data) return;
  const tbody = document.querySelector("#performance-table tbody");
  tbody.innerHTML = "";
  data.forEach(c => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${c.title}</td>
      <td>${c.campaign_type}</td>
      <td>${c.is_active ? "Active" : "Inactive"}</td>
      <td>${c.participants}</td>
      <td>${c.total_responses}</td>
    `;
    tbody.appendChild(row);
  });
}

async function loadBeautyMatch() {
  const data = await apiGet("/api/internal/dashboard/beauty-match-performance");
  if (!data) return;
  const tbody = document.querySelector("#beauty-match-table tbody");
  tbody.innerHTML = "";
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No Beauty Match activity yet</td></tr>`;
    return;
  }
  data.forEach(c => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${c.title}</td>
      <td>${c.total_plays}</td>
      <td>${c.completions}</td>
      <td>${c.avg_moves}</td>
      <td>${c.avg_time_seconds}</td>
    `;
    tbody.appendChild(row);
  });
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

document.getElementById("refresh-insights-btn").addEventListener("click", () => loadAIInsights(true));


loadOverview();
loadPerformance();
loadBeautyMatch();
loadCustomerSegments();
loadAIInsights();