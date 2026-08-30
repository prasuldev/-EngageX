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
function renderRecommendationCard(product, data) {
    const reasonLine = data.recommendation_reason
        ? `<div class="campaign-rec-reason">${data.ai_generated ? "✨ " : ""}${data.recommendation_reason}</div>`
        : "";

    return `
        <div class="campaign-recommendation">
            ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="campaign-recommendation-img" />` : ""}
            <div class="campaign-recommendation-info">
                <div class="campaign-recommendation-brand">${product.brand_name || ""}</div>
                <div class="campaign-recommendation-name">${product.name}</div>
                <div class="campaign-recommendation-category">${product.category_name || ""}</div>
                <div class="campaign-recommendation-price">₹ ${product.price}</div>
                <div class="campaign-recommendation-actions">
                    <a href="product.html?id=${product.id}" class="campaign-recommendation-link">Buy Now →</a>
                    <button type="button" class="campaign-recommendation-later">Maybe later</button>
                </div>
            </div>
        </div>
        ${reasonLine}
    `;
}

function renderSkinTwinResult(data) {
    const productsHtml = (data.products || []).map(p => `
        <div class="campaign-recommendation">
            ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" class="campaign-recommendation-img" />` : ""}
            <div class="campaign-recommendation-info">
                <div class="campaign-recommendation-brand">${p.brand_name || ""}</div>
                <div class="campaign-recommendation-name">${p.name}</div>
                <div class="campaign-recommendation-category">${p.category_name || ""}</div>
                <div class="campaign-recommendation-price">₹ ${p.price}</div>
                <a href="product.html?id=${p.id}" class="campaign-recommendation-link">Buy Now →</a>
            </div>
        </div>
    `).join("");

    const lowMatchNote = data.low_match
        ? `<div class="campaign-low-match-note">We found your best match below — we're adding more products for this concern soon.</div>`
        : "";

    return `
        <div class="campaign-skin-twin-blurb">${data.blurb || ""}</div>
        ${renderSkinTwinRoutine(data.routine)}
        ${lowMatchNote}
        <div class="campaign-skin-twin-products">${productsHtml}</div>
    `;
}


function renderMoodRitualResult(data) {
    const stepsHtml = (data.routine || []).map((step, i) => `
        <div class="campaign-mood-step" style="animation-delay: ${i * 0.15}s">
            <div class="campaign-mood-step-number">${i + 1}</div>
            <div class="campaign-mood-step-content">
                <div class="campaign-mood-step-category">${step.category}</div>
                <div class="campaign-mood-step-name">${step.product.name}</div>
                <div class="campaign-mood-step-caption">${step.caption}</div>
            </div>
        </div>
    `).join("");

    const streakHtml = data.streak
        ? `<div class="campaign-mood-streak">🔥 ${data.streak} day streak</div>`
        : "";

    return `
        <div class="campaign-mood-result">
            <div class="campaign-mood-result-title">${data.mood.label} — your ritual</div>
            <div class="campaign-mood-result-subtitle">Follow in order for best results</div>
            <div class="campaign-mood-steps">${stepsHtml}</div>
            ${streakHtml}
        </div>
    `;
}

function renderSkinTwinRoutine(routine) {
    if (!routine || !routine.steps || routine.steps.length === 0) return "";

    const stepsHtml = routine.steps.map(step => `
        <div class="campaign-routine-step">
            <div class="campaign-routine-step-header">
                <span class="campaign-routine-step-product">${step.product_name}</span>
                <span class="campaign-routine-step-when">${step.when}</span>
            </div>
            <div class="campaign-routine-step-freq">${step.frequency}</div>
            <div class="campaign-routine-step-instructions">${step.instructions || ""}</div>
        </div>
    `).join("");

    return `
        <div class="campaign-skin-twin-routine">
            <div class="campaign-routine-title">Your Daily Routine</div>
            ${stepsHtml}
            ${routine.note ? `<div class="campaign-routine-note">${routine.note}</div>` : ""}
        </div>
    `;
}

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
        const user = getLoggedInUser();

        el.collapsed.style.display = "none";
        el.expanded.style.display = "block";
        el.reward.style.display = "none";

        if (!user) {
            el.content.style.display = "none";
            el.questionText.textContent = "Log in to participate";
            el.reward.style.display = "block";
            el.reward.innerHTML = `
                <div class="campaign-login-prompt">
                    <p>You need to be logged in to play campaigns and unlock recommendations.</p>
                    <a href="login.html" class="campaign-login-btn">Log In</a>
                </div>
            `;
            return;
        }

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
        const res = await authFetch(`${API_BASE}/campaigns/${campaign.slug}/respond`, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (!res) return; // authFetch already redirected to login on 401

        if (!res.ok) {
            el.questionText.textContent = "Something went wrong";
            el.reward.textContent = "Please log in and try again.";
            setTimeout(() => {
                el.expanded.style.display = "none";
                el.collapsed.style.display = "flex";
            }, 3000);
            return;
        }

        const data = await res.json();
        console.log("Campaign response:", data);

        el.content.style.display = "none";
        el.reward.style.display = "block";

        if (data.products) {
            el.questionText.textContent = "Here's your skin twin match!";
            el.reward.innerHTML = renderSkinTwinResult(data);
        } else if (data.routine && data.mood) {
            el.questionText.textContent = "Your ritual is ready ✨";
            el.reward.innerHTML = renderMoodRitualResult(data);
        } else if (data.recommended_product) {
            el.questionText.textContent = "Here's your match!";
            el.reward.innerHTML = renderRecommendationCard(data.recommended_product, data);
            el.reward.querySelector(".campaign-recommendation-later")
                ?.addEventListener("click", closeCampaign);
        } else if (data.already_rewarded) {
            el.questionText.textContent = "Thanks for playing again!";
            el.reward.textContent = "You've already claimed your reward for this campaign.";
        } else {
            el.questionText.textContent = "Thanks!";
            el.reward.textContent = `🎉 You unlocked: ${data.reward_value}`;
        }

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