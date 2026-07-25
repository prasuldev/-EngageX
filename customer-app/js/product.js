async function loadProduct() {

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        document.getElementById("product-details").innerHTML =
            "<h2>Product Not Found</h2>";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/products/${id}`);
        const product = await response.json();

        if (!product || product.error) {
            document.getElementById("product-details").innerHTML =
                "<h2>Product Not Found</h2>";
            return;
        }

        document.getElementById("product-details").innerHTML = `

            <div class="product-page">

                <div class="product-image">

                    📦

                </div>

                <div class="product-info">

                    <h1>${product.name}</h1>

                    <p class="info">

                        <strong>Brand:</strong>

                        ${product.brand_name || ''}

                    </p>

                    <p class="info">

                        <strong>Category:</strong>

                        ${product.category_name || ''}

                    </p>

                    <p class="info">

                        <strong>Rating:</strong>

                        ⭐ ${product.rating ?? 'N/A'}

                    </p>

                    <p class="price">

                        ₹ ${product.price}

                    </p>

                    ${product.ingredients ? `

                        <p class="info">
                            <strong>Ingredients</strong>
                        </p>

                        <p>
                            ${product.ingredients}
                        </p>

                    ` : ''}

                    <button class="buy-btn">

                        Add to Cart

                    </button>

                </div>

            </div>

        `;

    } catch (error) {
        console.error("Error loading product:", error);
        document.getElementById("product-details").innerHTML =
            "<h2>Something went wrong loading this product.</h2>";
    }
}

loadProduct();