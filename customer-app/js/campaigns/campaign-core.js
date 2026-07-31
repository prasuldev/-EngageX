const renderers = {};

function registerRenderer(type, rendererFn) {
    renderers[type] = rendererFn;
}

let shellTemplatePromise = null;

function getShellTemplate() {
    if (!shellTemplatePromise) {
        shellTemplatePromise = fetch("../components/campaigns/campaign-shell.html")
            .then(res => res.text());
    }
    return shellTemplatePromise;
}

/**
 * Fetches every currently-active campaign for a given context.
 */
async function loadActiveCampaigns(context = "home") {
    try {
        const res = await fetch(`${API_BASE}/campaigns/active?context=${encodeURIComponent(context)}`);
        return await res.json();
    } catch (error) {
        console.error("Error loading campaigns:", error);
        return [];
    }
}

/**
 * Mounts a single campaign widget (collapsed pill -> expanded panel)
 * into containerEl. Each call creates a fully independent instance,
 * so many can exist on the same page at once.
 *
 * Campaigns are always replayable on refresh -- there's no local lock.
 * Whether a reward is granted again is decided server-side.
 */
async function mountCampaignWidget(campaign, containerEl) {
    const template = await getShellTemplate();
    containerEl.innerHTML = template;

    const el = {
        root: containerEl.querySelector(".campaign-strip"),
        collapsed: containerEl.querySelector(".campaign-collapsed"),
        expanded: containerEl.querySelector(".campaign-expanded"),
        titleText: containerEl.querySelector(".campaign-title-text"),
        subtitleText: containerEl.querySelector(".campaign-subtitle-text"),
        openBtn: containerEl.querySelector(".campaign-open-btn"),
        dismissBtn: containerEl.querySelector(".campaign-close-collapsed"),
        closeBtn: containerEl.querySelector(".campaign-close-btn"),
        questionText: containerEl.querySelector(".campaign-question-text"),
        content: containerEl.querySelector(".campaign-content"),
        reward: containerEl.querySelector(".campaign-reward"),
    };

    el.titleText.textContent = campaign.title;
    el.subtitleText.textContent = campaign.description || "Play now and win rewards";

    async function openCampaign() {
        el.collapsed.style.display = "none";
        el.expanded.style.display = "block";
        el.reward.style.display = "none";
        el.content.style.display = "flex";

        try {
            const res = await fetch(`${API_BASE}/campaigns/${campaign.slug}`);
            const detail = await res.json();

            const renderer = renderers[detail.campaign_type];

            if (!renderer) {
                console.error("No renderer registered for type:", detail.campaign_type);
                el.questionText.textContent = "This campaign type isn't supported yet.";
                return;
            }

            renderer.render(detail, {
                questionEl: el.questionText,
                contentEl: el.content,
                onComplete: submitCampaignResult
            });

        } catch (error) {
            console.error("Error opening campaign:", error);
        }
    }

    async function submitCampaignResult(payload) {
        try {
            const user = getLoggedInUser();

            const res = await fetch(`${API_BASE}/campaigns/${campaign.slug}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user ? user.id : null,
                    ...payload
                })
            });

            const data = await res.json();

            el.content.style.display = "none";
            el.reward.style.display = "block";

            if (data.requires_login) {
                el.questionText.textContent = "Thanks for playing!";
                el.reward.textContent = "Log in to earn rewards from campaigns.";
            } else if (data.already_rewarded) {
                el.questionText.textContent = "Thanks for playing again!";
                el.reward.textContent = "You've already claimed your reward for this campaign.";
            } else {
                el.questionText.textContent = "Thanks!";
                el.reward.textContent = `🎉 You unlocked: ${data.reward_value}`;
            }

            setTimeout(() => {
                el.expanded.style.display = "none";
                el.collapsed.style.display = "flex";
            }, 5000);

        } catch (error) {
            console.error("Error submitting campaign result:", error);
        }
    }

    function closeCampaign() {
        el.expanded.style.display = "none";
        el.collapsed.style.display = "flex";
    }

    el.openBtn.addEventListener("click", openCampaign);
    el.closeBtn.addEventListener("click", closeCampaign);
    el.dismissBtn.addEventListener("click", closeCampaign);

    return el.root;
}