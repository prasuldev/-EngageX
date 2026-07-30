import { getProduct } from "../services/productService.js";

const productContainer = document.getElementById("product-details");

async function loadProduct() {

    // Show loading state
    productContainer.innerHTML = `
        <div class="flex justify-center items-center py-20">
            <p class="text-lg text-gray-500 animate-pulse">
                Loading product...
            </p>
        </div>
    `;

    // Read Product ID from URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        productContainer.innerHTML = `
            <div class="text-center py-20">
                <h2 class="text-2xl font-semibold text-red-500">
                    Product Not Found
                </h2>
            </div>
        `;
        return;
    }

    try {

        // Fetch product from backend
        const product = await getProduct(id);

        if (!product || product.error) {
            productContainer.innerHTML = `
                <div class="text-center py-20">
                    <h2 class="text-2xl font-semibold text-red-500">
                        Product Not Found
                    </h2>
                </div>
            `;
            return;
        }

        // Render Product
        productContainer.innerHTML = `

            <div class="max-w-7xl mx-auto px-6 py-10">

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    <!-- Product Image -->
                    <div class="product-image">

                        <img
                            src="${product.image || "../assets/images/no-image.png"}"
                            alt="${product.name}"
                            class="w-full h-[500px] object-cover rounded-xl shadow"
                            onerror="this.src='../assets/images/no-image.png'">

                    </div>

                    <!-- Product Information -->
                    <div class="product-info">

                        <h1 class="text-4xl font-bold mb-4">
                            ${product.name}
                        </h1>

                        <p class="text-gray-600 mb-2">
                            <strong>Brand:</strong>
                            ${product.brand_name || "N/A"}
                        </p>

                        <p class="text-gray-600 mb-2">
                            <strong>Category:</strong>
                            ${product.category_name || "N/A"}
                        </p>

                        <p class="text-yellow-500 text-lg mb-4">
                            ⭐ ${product.rating ?? "N/A"}
                        </p>

                        <p class="text-3xl font-bold text-pink-600 mb-6">
                            ₹${product.price}
                        </p>

                        ${product.description ? `
                            <div class="mb-6">

                                <h2 class="text-xl font-semibold mb-2">
                                    Description
                                </h2>

                                <p class="text-gray-700 leading-relaxed">
                                    ${product.description}
                                </p>

                            </div>
                        ` : ""}

                        ${product.ingredients ? `
                            <div class="mb-6">

                                <h2 class="text-xl font-semibold mb-2">
                                    Ingredients
                                </h2>

                                <p class="text-gray-700 leading-relaxed">
                                    ${product.ingredients}
                                </p>

                            </div>
                        ` : ""}

                        ${product.stock !== undefined ? `
                            <p class="mb-6">

                                <strong>Availability:</strong>

                                <span class="${product.stock > 0
                                    ? "text-green-600"
                                    : "text-red-600"}">

                                    ${product.stock > 0
                                        ? "In Stock"
                                        : "Out of Stock"}

                                </span>

                            </p>
                        ` : ""}

                        <!-- Action Buttons -->
                        <div class="flex flex-wrap gap-4">

                            <button
                                id="addCart"
                                class="buy-btn">

                                Add to Cart

                            </button>

                            <button
                                id="wishlistBtn"
                                class="px-6 py-3 border rounded-lg hover:bg-gray-100 transition">

                                ❤ Wishlist

                            </button>

                        </div>

                    </div>

                </div>

                <!-- Related Products -->
                <section class="mt-20">

                    <h2 class="text-3xl font-bold mb-8">
                        Related Products
                    </h2>

                    <div
                        id="related-products"
                        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                        <div class="text-gray-500">
                            Related products coming soon...
                        </div>

                    </div>

                </section>

            </div>

        `;

        // Event Tracking Placeholder
        console.log("Product Viewed", {
            id: product.id,
            name: product.name,
            category: product.category_name
        });

        // Button Events
        const addCartBtn = document.getElementById("addCart");
        const wishlistBtn = document.getElementById("wishlistBtn");

        addCartBtn?.addEventListener("click", () => {
            console.log("Added to Cart:", product);

            // TODO:
            // addToCart(product);
        });

        wishlistBtn?.addEventListener("click", () => {
            console.log("Added to Wishlist:", product);

            // TODO:
            // addToWishlist(product);
        });

    }

    catch (error) {

        console.error("Error loading product:", error);

        productContainer.innerHTML = `
            <div class="text-center py-20">

                <h2 class="text-2xl font-semibold text-red-500">

                    Something went wrong loading this product.

                </h2>

                <p class="text-gray-500 mt-4">

                    Please try again later.

                </p>

            </div>
        `;

    }

}

document.addEventListener("DOMContentLoaded", loadProduct);