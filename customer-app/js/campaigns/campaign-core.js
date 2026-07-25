let activeCampaign = null;
const renderers = {};

function registerRenderer(type, rendererFn) {
    renderers[type] = rendererFn;
}

function getCampaignStorageKey(slug) {
    return `campaign_status_${slug}`;
}

function getCampaignStatus(slug) {
    return localStorage.getItem(getCampaignStorageKey(slug));
}

function setCampaignStatus(slug, status) {
    localStorage.setItem(getCampaignStorageKey(slug), status);
}

async function loadCampaign(context = "home") {
    try {
        const res = await fetch(`${API_BASE}/campaigns/active?context=${encodeURIComponent(context)}`);
        const campaigns = await res.json();

        if (!campaigns || campaigns.length === 0) {
            document.getElementById("campaign-widget").style.display = "none";
            return;
        }

        // Always show the first active campaign, regardless of past status
        activeCampaign = campaigns[0];
        document.getElementById("campaign-title-text").textContent = activeCampaign.title;
        document.getElementById("campaign-widget").style.display = "block";

    } catch (error) {
        console.error("Error loading campaign:", error);
    }
}

async function openCampaign() {
    if (!activeCampaign) return;

    document.getElementById("campaign-collapsed").style.display = "none";
    document.getElementById("campaign-expanded").style.display = "block";
    document.getElementById("campaign-reward").style.display = "none";

    const status = getCampaignStatus(activeCampaign.slug);

    if (status === "answered") {
        document.getElementById("campaign-content").style.display = "none";
        document.getElementById("campaign-question-text").textContent =
            "You've already completed this! Check back soon for a new one.";
        return;
    }

    // reset content display in case it was hidden by a previous "already answered" view
    document.getElementById("campaign-content").style.display = "flex";

    try {
        const res = await fetch(`${API_BASE}/campaigns/${activeCampaign.slug}`);
        const detail = await res.json();

        const renderer = renderers[detail.campaign_type];

        if (!renderer) {
            console.error("No renderer registered for type:", detail.campaign_type);
            document.getElementById("campaign-question-text").textContent = "This campaign type isn't supported yet.";
            return;
        }

        renderer.render(detail, {
            questionEl: document.getElementById("campaign-question-text"),
            contentEl: document.getElementById("campaign-content"),
            onComplete: submitCampaignResult
        });

    } catch (error) {
        console.error("Error opening campaign:", error);
    }
}

async function submitCampaignResult(payload) {
    try {
        const user = getLoggedInUser();

        const res = await fetch(`${API_BASE}/campaigns/${activeCampaign.slug}/respond`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user ? user.id : null,
                ...payload
            })
        });

        const data = await res.json();

        document.getElementById("campaign-content").style.display = "none";
        document.getElementById("campaign-question-text").textContent = "Thanks!";

        const rewardBox = document.getElementById("campaign-reward");
        rewardBox.style.display = "block";
        rewardBox.textContent = `🎉 You unlocked: ${data.reward_value}`;

        setCampaignStatus(activeCampaign.slug, "answered");

        // No more auto-hiding the whole widget — just re-collapse it
        setTimeout(() => {
            document.getElementById("campaign-expanded").style.display = "none";
            document.getElementById("campaign-collapsed").style.display = "flex";
        }, 5000);

    } catch (error) {
        console.error("Error submitting campaign result:", error);
    }
}

function closeCampaign() {
    // Dismiss just collapses the panel back down — doesn't hide the widget entirely anymore
    document.getElementById("campaign-expanded").style.display = "none";
    document.getElementById("campaign-collapsed").style.display = "flex";
}

function initializeCampaign(context = "home") {
    loadCampaign(context);

    document.getElementById("campaign-open-btn")?.addEventListener("click", openCampaign);
    document.getElementById("campaign-close-btn")?.addEventListener("click", closeCampaign);
    document.getElementById("campaign-dismiss-collapsed-btn")?.addEventListener("click", closeCampaign);
}