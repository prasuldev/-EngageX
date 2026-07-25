let currentCategory = "";

async function loadProducts(category = "") {
    try {
        const url = category
            ? `${API_BASE}/products?category=${encodeURIComponent(category)}&limit=50`
            : `${API_BASE}/products?limit=50`;

        const response = await fetch(url);
        const products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

function renderProducts(products) {
    const container = document.getElementById("products-container");
    container.innerHTML = "";

    if (products.length === 0) {
        container.innerHTML = `<p>No products found in this category.</p>`;
        return;
    }

    products.forEach(product => {
        container.innerHTML += `
            <div class="product-card">
                <div class="product-image">📦</div>
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
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentCategory = btn.dataset.category;
            loadProducts(currentCategory);

            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
});