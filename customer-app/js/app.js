async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products?limit=12`);
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

document.addEventListener("DOMContentLoaded", async () => {
    const products = await loadProducts();
    const container = document.getElementById("products-container");

    if (!container) {
        console.error("products-container not found");
        return;
    }

    container.innerHTML = "";
    products.slice(0, 12).forEach(product => {
        container.innerHTML += createProductCard(product);
    });
});