import { getProduct } from "../services/productService.js";

const productContainer = document.getElementById("product-details");

function addToCart(product) {

    const cart = JSON.parse(
        localStorage.getItem("cart") || "[]"
    );

    const existingProduct = cart.find(
        item => item.id === product.id
    );

    if (existingProduct) {

        existingProduct.quantity =
            (existingProduct.quantity || 1) + 1;

    } else {

        cart.push({
            ...product,
            quantity: 1
        });

    }

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );
}

function toggleWishlist(product) {

    const wishlist = JSON.parse(
        localStorage.getItem("wishlist") || "[]"
    );

    const exists = wishlist.find(
        item => item.id === product.id
    );

    let updatedWishlist;

    if (exists) {

        updatedWishlist = wishlist.filter(
            item => item.id !== product.id
        );

        showToast("Removed from Wishlist");

    } else {

        updatedWishlist = [
            ...wishlist,
            product
        ];

        showToast("❤ Added to Wishlist");
    }

    localStorage.setItem(
        "wishlist",
        JSON.stringify(updatedWishlist)
    );

    window.dispatchEvent(
        new Event("wishlistUpdated")
    );
}

function isInCart(productId) {

    const cart = JSON.parse(
        localStorage.getItem("cart") || "[]"
    );

    return cart.some(
        item => item.id === productId
    );
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

function updateCartButton(product, addCartBtn) {

    if (!addCartBtn) return;

    if (isInCart(product.id)) {

        addCartBtn.textContent = "✓ Added to Cart";

        addCartBtn.className =
            "buy-btn bg-green-600 text-white";

    } else {

        addCartBtn.textContent = "Add to Cart";

        addCartBtn.className = "buy-btn";
    }
}

function removeFromCart(productId) {

    const cart = JSON.parse(
        localStorage.getItem("cart") || "[]"
    );

    const updatedCart = cart.filter(
        item => item.id !== productId
    );

    localStorage.setItem(
        "cart",
        JSON.stringify(updatedCart)
    );
}

function updateWishlistButton(product, button) {

    const wishlist = JSON.parse(
        localStorage.getItem("wishlist") || "[]"
    );

    const exists = wishlist.some(
        item => item.id === product.id
    );

    if (exists) {

        button.innerHTML = "❤ Wishlisted";

        button.classList.add(
            "bg-pink-600",
            "text-white"
        );

    } else {

        button.innerHTML = "❤ Wishlist";

        button.classList.remove(
            "bg-pink-600",
            "text-white"
        );
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

        // Render Product
        productContainer.innerHTML = `

            <div class="max-w-7xl mx-auto px-6 py-10">

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    <!-- Product Image -->
                    <div class="product-image">

                        <div class="product-placeholder">

                            <div class="product-placeholder-icon">
                                📦
                            </div>

                        <div class="product-placeholder-text">
                            Product Image
                        </div>

                    </div>

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
        updateCartButton(product, addCartBtn);

        window.addEventListener(
            "cartUpdated",
            () => updateCartButton(product, addCartBtn)
        );

        const wishlistBtn = document.getElementById("wishlistBtn");
        updateWishlistButton(product, wishlistBtn);

        addCartBtn?.addEventListener("click", () => {

            if (isInCart(product.id)) {

                removeFromCart(product.id);

                showToast("Removed from Cart");

            } else {

                addToCart(product);

                showToast("✓ Added to Cart");

            }

            window.dispatchEvent(
                new Event("cartUpdated")
            );

            updateCartButton(product, addCartBtn);

        });
       

        wishlistBtn?.addEventListener("click", () => {
            toggleWishlist(product);
            updateWishlistButton(product, wishlistBtn);
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