async function loadProduct() {

    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");

    const response = await fetch("../data/products.json");

    const products = await response.json();

    const product = products.find(
        p => String(p.Product_ID) === id
    );

    if (!product) {

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

                <h1>${product.Product_Name}</h1>

                <p class="info">

                    <strong>Brand:</strong>

                    ${product.Brand}

                </p>

                <p class="info">

                    <strong>Category:</strong>

                    ${product.Category}

                </p>

                <p class="info">

                    <strong>Rating:</strong>

                    ⭐ ${product.Rating}

                </p>

                <p class="price">

                    ₹ ${product.Price}

                </p>

                <p class="info">

                    <strong>Ingredients</strong>

                </p>

                <p>

                    ${product.Ingredients}

                </p>

                <button class="buy-btn">

                    Add to Cart

                </button>

            </div>

        </div>

    `;
}
loadProduct();