let activeCampaign = null;

function getCampaignStorageKey(slug) {
    return `campaign_status_${slug}`;
}

function getCampaignStatus(slug) {
    return localStorage.getItem(getCampaignStorageKey(slug)); // null | "answered" | "dismissed"
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

        // Find the first campaign not already answered or dismissed
        const candidate = campaigns.find(c => !getCampaignStatus(c.slug));

        if (!candidate) {
            document.getElementById("campaign-widget").style.display = "none";
            return;
        }

        activeCampaign = candidate;
        document.getElementById("campaign-title-text").textContent = activeCampaign.title;
        document.getElementById("campaign-widget").style.display = "block";

    } catch (error) {
        console.error("Error loading campaign:", error);
    }
}

async function openCampaign() {
    if (!activeCampaign) return;

    try {
        const res = await fetch(`${API_BASE}/campaigns/${activeCampaign.slug}`);
        const detail = await res.json();

        const question = detail.questions[0];
        const options = JSON.parse(question.options);

        document.getElementById("campaign-question-text").textContent = question.question_text;

        const optionsContainer = document.getElementById("campaign-options");
        optionsContainer.innerHTML = "";
        optionsContainer.style.display = "flex";

        options.forEach(opt => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "campaign-option-btn";
            btn.textContent = opt;
            btn.addEventListener("click", () => submitCampaignAnswer(question.id, opt));
            optionsContainer.appendChild(btn);
        });

        document.getElementById("campaign-reward").style.display = "none";
        document.getElementById("campaign-collapsed").style.display = "none";
        document.getElementById("campaign-expanded").style.display = "block";

    } catch (error) {
        console.error("Error opening campaign:", error);
    }
}

async function submitCampaignAnswer(questionId, answer) {
    const user = getLoggedInUser();

    try {
        const res = await fetch(`${API_BASE}/campaigns/${activeCampaign.slug}/respond`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user ? user.id : null,
                answers: [{ question_id: questionId, answer: answer }]
            })
        });

        const data = await res.json();

        document.getElementById("campaign-options").style.display = "none";
        document.getElementById("campaign-question-text").textContent = "Thanks for your answer!";

        const rewardBox = document.getElementById("campaign-reward");
        rewardBox.style.display = "block";
        rewardBox.textContent = `🎉 You unlocked: ${data.reward_value}`;

        setCampaignStatus(activeCampaign.slug, "answered");

        // Auto-hide after a moment so it doesn't linger on the page
        setTimeout(() => {
            document.getElementById("campaign-widget").style.display = "none";
        }, 5000);

    } catch (error) {
        console.error("Error submitting answer:", error);
    }
}

function closeCampaign() {
    if (activeCampaign) {
        setCampaignStatus(activeCampaign.slug, "dismissed");
    }
    document.getElementById("campaign-expanded").style.display = "none";
    document.getElementById("campaign-widget").style.display = "none";
}

function initializeCampaign(context = "home") {
    loadCampaign(context);

    document.getElementById("campaign-open-btn")?.addEventListener("click", openCampaign);
    document.getElementById("campaign-close-btn")?.addEventListener("click", closeCampaign);
}