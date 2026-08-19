const API_BASE = "https://engagex-3.onrender.com";

export async function getActiveCampaigns(context = "global") {
    const response = await fetch(
        `${API_BASE}/campaigns/active?context=${context}`
    );

    if (!response.ok) {
        throw new Error("Failed to load campaigns");
    }

    return await response.json();
}

export async function getCampaign(slug) {
    const response = await fetch(
        `${API_BASE}/campaigns/${slug}`
    );

    if (!response.ok) {
        throw new Error("Campaign not found");
    }

    return await response.json();
}

export async function submitGame(slug, data) {
    const response = await fetch(
        `${API_BASE}/campaigns/${slug}/respond`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }
    );

    return await response.json();
}