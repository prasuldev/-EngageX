requireAuth();

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

loadOverview();
loadPerformance();
loadBeautyMatch();