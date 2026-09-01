(function () {
    const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[char]);

    const productCard = product => `
        <article class="customer-ai__product">
            <div class="customer-ai__product-image">${productVisualMarkup(product)}</div>
            <div><span class="customer-ai__tag">${escapeHtml(product.sentiment || product.category || "Recommended")}</span>
            <h4>${escapeHtml(product.name)}</h4><p>${escapeHtml(product.why)}</p>
            <small>${escapeHtml(product.review_insight || "Personalized for you")}</small>
            <a href="product.html?id=${encodeURIComponent(product.id)}">See why &amp; shop</a></div>
        </article>`;

    const empty = message => `<p class="customer-ai__empty">${escapeHtml(message)}</p>`;

    function render(data) {
        const root = document.getElementById("customer-ai-content");
        if (!root) return;
        const compatibility = data.compatibility || {};
        root.innerHTML = `${data.preview ? '<p class="customer-ai__preview">Preview data · live personalization appears after the API deploys</p>' : ''}
            <div class="customer-ai__panel customer-ai__panel--wide"><div class="customer-ai__heading"><div><span>01</span><h3>Picked for you</h3></div><p>Every recommendation includes the reason behind it.</p></div>
                <div class="customer-ai__products">${(data.personalized_feed || []).slice(0, 4).map(productCard).join("") || empty("Browse or save products to personalize this feed.")}</div></div>
            <div class="customer-ai__panel"><div class="customer-ai__heading"><div><span>02</span><h3>Replenishment radar</h3></div></div>
                <div class="customer-ai__list">${(data.replenishment_reminders || []).map(item => `<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.status)}</span></div>`).join("") || empty("Your reminders will appear after your first order.")}</div></div>
            <div class="customer-ai__panel"><div class="customer-ai__heading"><div><span>03</span><h3>Smart bundles</h3></div></div>
                <div class="customer-ai__list">${(data.bundles || []).map(item => `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.why)}</span></div>`).join("") || empty("Bundle ideas will appear as we learn your routine.")}</div></div>
            <div class="customer-ai__panel"><div class="customer-ai__heading"><div><span>04</span><h3>Routine coach</h3></div></div>
                <ol class="customer-ai__routine">${(data.routine_coaching || []).map(item => `<li><b>${item.step}</b><div><strong>${escapeHtml(item.product)}</strong><span>${escapeHtml(item.guidance)}</span></div></li>`).join("") || empty("Order a product to start your post-purchase routine.")}</ol></div>
            <div class="customer-ai__panel"><div class="customer-ai__heading"><div><span>05</span><h3>Your best offers</h3></div></div>
                <div class="customer-ai__list">${(data.offers || []).map(item => `<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.reward_value || item.description || "Open campaign")}</span></div>`).join("") || empty("No active personalized rewards right now.")}</div></div>
            <div class="customer-ai__panel customer-ai__panel--wide customer-ai__match"><div><span class="customer-ai__tag">Compatibility intelligence</span><h3>${compatibility.available ? `Made for ${escapeHtml(compatibility.skin_type)} skin` : "Unlock your compatibility profile"}</h3><p>${escapeHtml(compatibility.summary || "Complete Skin Twin for skin-aware recommendations.")}</p></div>
                <div class="customer-ai__match-note"><strong>Shade matching</strong><span>Coming after verified shade and undertone data is added.</span></div></div>`;
    }

    async function init() {
        const root = document.getElementById("customer-ai-content");
        if (!root || typeof authFetch !== "function") return;
        try {
            const response = await authFetch(`${API_BASE}/api/customer/ai/home`);
            if (!response) return;
            if (!response.ok) throw new Error(`Customer AI request failed (${response.status})`);
            render(await response.json());
        } catch (error) {
            console.error(error);
            render({
                preview: true,
                personalized_feed: [
                    { id: 1, name: "Hydration Hero", category: "Skincare", why: "Matches your interest in hydration", review_insight: "4.8/5 · customers love the lightweight finish", sentiment: "Loved" },
                    { id: 2, name: "Barrier Support Serum", category: "Serum", why: "Complements a moisture-focused routine", review_insight: "4.6/5 · praised for comfortable wear", sentiment: "Positive" }
                ],
                replenishment_reminders: [{ name: "Daily Moisturizer", status: "Due in about 6 days" }],
                bundles: [{ title: "Hydration duo", why: "Pairs a serum with your moisturizer" }],
                routine_coaching: [{ step: 1, product: "Gentle Cleanser", guidance: "Start with clean skin and follow the product label." }, { step: 2, product: "Barrier Support Serum", guidance: "Patch test before adding it to your regular routine." }],
                offers: [{ title: "Complete Beauty Match", reward_value: "Unlock the best eligible reward for your profile" }],
                compatibility: { available: false, summary: "Complete Skin Twin to unlock skin-aware recommendations." }
            });
        }
    }

    document.addEventListener("DOMContentLoaded", init);
})();
