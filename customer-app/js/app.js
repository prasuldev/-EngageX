function shuffleArray(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products?limit=50`);
        const products = await response.json();
        console.log("Products Loaded:", products);
        return products;
    } catch (error) {
        console.error("Error Loading Products:", error);
        return [];
    }
}

function createProductCard(product) {
    return `
        <div class="product-card">
            <div class="product-image">
                📦
            </div>
            <div class="product-info">
                <div class="product-brand">${product.brand_name || ''}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-category">${product.category_name || ''}</div>
                <div class="product-rating">⭐ ${product.rating ?? 'N/A'}</div>
                <div class="product-price">₹ ${product.price}</div>
                <a href="product.html?id=${product.id}">
                    <button class="product-btn">View Details</button>
                </a>
            </div>
        </div>
    `;
}

/**
 * Works out which product indexes should have a campaign inserted right
 * after them, so that every campaign appears exactly once, spread evenly
 * across the whole list (instead of repeating on a fixed interval).
 */
function getCampaignInsertPositions(productCount, campaignCount) {
    if (campaignCount === 0 || productCount === 0) return [];

    // Divide the list into (campaignCount + 1) chunks, and drop a campaign
    // after each chunk boundary -- e.g. 3 campaigns, 40 products -> after
    // product 10, 20, 30.
    const interval = Math.max(1, Math.floor(productCount / (campaignCount + 1)));

    const positions = [];
    for (let i = 1; i <= campaignCount; i++) {
        const pos = interval * i;
        if (pos < productCount) positions.push(pos);
    }
    return positions;
}

async function renderProductsWithCampaigns(container, products) {
    container.innerHTML = "";

    // campaign-core.js must be loaded before app.js for this to exist.
    const campaigns = (typeof loadActiveCampaigns === "function")
        ? await loadActiveCampaigns("home")
        : [];

    console.log("HOME CAMPAIGNS:", campaigns);
    console.log("HOME CAMPAIGN COUNT:", campaigns.length);

    const insertPositions = getCampaignInsertPositions(products.length, campaigns.length);
    let campaignIndex = 0;

    products.forEach((product, i) => {
        container.insertAdjacentHTML("beforeend", createProductCard(product));

        const productNumber = i + 1; // 1-based count of products rendered so far

        if (insertPositions.includes(productNumber) && campaignIndex < campaigns.length) {
            const slot = document.createElement("div");
            slot.className = "campaign-slot";
            container.appendChild(slot);

            mountCampaignWidget(campaigns[campaignIndex], slot);
            campaignIndex++;
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {

    let products = await loadProducts();

    // Mix the products
    products = shuffleArray(products);

    const container = document.getElementById("products-container");

    if (!container) {
        console.error("products-container not found");
        return;
    }

    await renderProductsWithCampaigns(container, products);
});