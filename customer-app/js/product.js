import { getProduct } from "../services/productservice.js";

const productContainer = document.getElementById("product-details");

async function addToCart(product) {
    const response = await authFetch(`${API_BASE}/cart/add`, {
        method: "POST",
        body: JSON.stringify({
            product_id: product.id,
            quantity: 1
        })
    });

    if (!response) return false;

    const data = await response.json();

    if (!response.ok) {
        alert(data.detail || "Failed to add to cart");
        return false;
    }

    return true;
}

async function isInCart(productId) {
    const response = await authFetch(`${API_BASE}/cart`, { method: "GET" });
    if (!response || !response.ok) return false;

    const cart = await response.json();
    return cart.some(item => item.id === productId);
}

function showToast(message) {

    const existingToast =
        document.getElementById("toast-message");

    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");

    toast.id = "toast-message";

    toast.className =
        "fixed top-24 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50";

    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
}

async function updateCartButton(product, addCartBtn) {
    if (!addCartBtn) return;

    const inCart = await isInCart(product.id);

    if (inCart) {
        addCartBtn.textContent = "✓ Added to Cart";
        addCartBtn.className = "buy-btn bg-green-600 text-white";
    } else {
        addCartBtn.textContent = "Add to Cart";
        addCartBtn.className = "buy-btn";
    }
}

async function removeFromCart(productId) {
    const response = await authFetch(`${API_BASE}/cart/${productId}`, {
        method: "DELETE"
    });
    return !!response;
}

async function isInWishlist(productId) {
    const response = await authFetch(`${API_BASE}/wishlist`, { method: "GET" });
    if (!response || !response.ok) return false;

    const wishlist = await response.json();
    return wishlist.some(item => item.id === productId);
}

async function toggleWishlist(product) {
    const inWishlist = await isInWishlist(product.id);

    if (inWishlist) {
        await authFetch(`${API_BASE}/wishlist/${product.id}`, { method: "DELETE" });
        showToast("Removed from Wishlist");
    } else {
        await authFetch(`${API_BASE}/wishlist/add`, {
            method: "POST",
            body: JSON.stringify({ product_id: product.id })
        });
        showToast("❤ Added to Wishlist");
    }

    window.dispatchEvent(new Event("wishlistUpdated"));
}

async function updateWishlistButton(product, button) {
    const inWishlist = await isInWishlist(product.id);

    if (inWishlist) {
        button.innerHTML = "❤ Wishlisted";
        button.classList.add("bg-pink-600", "text-white");
    } else {
        button.innerHTML = "❤ Wishlist";
        button.classList.remove("bg-pink-600", "text-white");
    }
}

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

        if (isLoggedIn()) {
            authFetch(`${API_BASE}/activity`, {
                method: "POST",
                body: JSON.stringify({
                    product_id: product.id,
                    activity_type: "product_view"
                })
            }).catch(error => console.warn("Product view tracking failed:", error));
        }

        // Render Product
        productContainer.innerHTML = `

            <div class="max-w-7xl mx-auto px-6 py-10">

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    <!-- Product Image -->
                    <div class="product-image">

                        ${productVisualMarkup(product, "product-visual--detail")}

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
        await updateCartButton(product, addCartBtn);

        window.addEventListener(
            "cartUpdated",
            () => updateCartButton(product, addCartBtn)
        );

        const wishlistBtn = document.getElementById("wishlistBtn");
        await updateWishlistButton(product, wishlistBtn);

        wishlistBtn?.addEventListener("click", async () => {
            await toggleWishlist(product);
            await updateWishlistButton(product, wishlistBtn);
        });

        addCartBtn?.addEventListener("click", async () => {
            const inCart = await isInCart(product.id);

            if (inCart) {
                await removeFromCart(product.id);
                showToast("Removed from Cart");
            } else {
                const success = await addToCart(product);
                if (!success) return;
                showToast("✓ Added to Cart");
            }

            window.dispatchEvent(new Event("cartUpdated"));
            await updateCartButton(product, addCartBtn);

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
