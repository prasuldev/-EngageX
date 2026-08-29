document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) return;
    if (!requireRole(["admin"])) return;

    const user = getInternalUser();
    const greeting = document.getElementById("user-greeting");
    if (greeting) greeting.textContent = user.full_name;

    await loadTeamOverview();
    await loadTeam();

    document.getElementById("add-team-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const errEl = document.getElementById("team-error");
        errEl.textContent = "";

        try {
            const res = await fetch(`${API_BASE}/api/internal/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${getInternalToken()}`
                },
                body: JSON.stringify({
                    full_name: document.getElementById("new-name").value,
                    email: document.getElementById("new-email").value,
                    password: document.getElementById("new-password").value,
                    role: document.getElementById("new-role").value
                })
            });

            if (!res.ok) {
                const err = await res.json();
                errEl.textContent = err.detail || "Failed to add team member";
                return;
            }

            e.target.reset();
            await loadTeam();
            await loadTeamOverview();
        } catch {
            errEl.textContent = "Network error";
        }
    });
});

async function loadTeamOverview() {
    const res = await fetch(`${API_BASE}/api/internal/users/team-overview`, {
        headers: { "Authorization": `Bearer ${getInternalToken()}` }
    });
    if (!res.ok) return;

    const rows = await res.json();
    const tbody = document.querySelector("#team-overview-table tbody");
    tbody.innerHTML = rows.length
        ? rows.map(r => `
            <tr>
                <td>${r.full_name}</td>
                <td>${r.role}</td>
                <td>${r.campaigns_generated}</td>
                <td>${r.orders_updated}</td>
                <td>${r.last_active ? new Date(r.last_active).toLocaleString() : "Never"}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="5">No team activity yet</td></tr>`;
}

async function loadTeam() {
    const res = await fetch(`${API_BASE}/api/internal/users`, {
        headers: { "Authorization": `Bearer ${getInternalToken()}` }
    });
    if (!res.ok) return;

    const users = await res.json();
    const tbody = document.querySelector("#team-table tbody");
    tbody.innerHTML = users.map(u =>
        `<tr><td>${u.full_name}</td><td>${u.email}</td><td>${u.role}</td></tr>`
    ).join("");
}