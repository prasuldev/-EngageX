const cartContainer = document.getElementById("cart-items");

function getCart() {
    return JSON.parse(
        localStorage.getItem("cart") || "[]"
    );
}

function saveCart(cart) {
    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );
}

function notifyCartUpdated() {
    window.dispatchEvent(
        new Event("cartUpdated")
    );
}

function removeItem(id) {

    const updatedCart = getCart().filter(
        item => item.id !== id
    );

    saveCart(updatedCart);

    notifyCartUpdated();

    renderCart();
}

function updateQuantity(id, change) {

    const cart = getCart();

    const item = cart.find(
        product => product.id === id
    );

    if (!item) return;

    item.quantity = (item.quantity || 1) + change;

    if (item.quantity <= 0) {
        removeItem(id);
        return;
    }

    saveCart(cart);

    notifyCartUpdated();

    renderCart();
}

function renderCart() {

    const cart = getCart();

    // Empty Cart State
    if (cart.length === 0) {

        cartContainer.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm p-12 text-center">

                <div class="text-6xl mb-4">
                    🛒
                </div>

                <h2 class="text-3xl font-bold mb-3">
                    Your cart is empty
                </h2>

                <p class="text-gray-500 mb-8">
                    Explore our beauty collection and discover your next favorite product.
                </p>

                <a
                    href="products.html"
                    class="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition">

                    Shop Now

                </a>

            </div>
        `;

        document.getElementById("subtotal").textContent = "₹0";
        document.getElementById("total").textContent = "₹0";

        return;
    }

    let subtotal = 0;

    cartContainer.innerHTML = cart.map(product => {

        const quantity = product.quantity || 1;

        subtotal += product.price * quantity;

        return `
            <div class="bg-white rounded-2xl shadow-sm border p-6">

                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                    <div class="flex items-center gap-5">

                        <div
                            class="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">

                            📦

                        </div>

                        <div>

                            <h3 class="text-xl font-semibold">
                                ${product.name}
                            </h3>

                            <p class="text-gray-500">
                                ${product.brand_name || ""}
                            </p>

                            <p class="text-pink-600 font-bold text-lg mt-2">
                                ₹${product.price}
                            </p>

                        </div>

                    </div>

                    <div class="flex items-center gap-6">

                        <div
                            class="flex items-center border rounded-lg overflow-hidden">

                            <button
                                onclick="updateQuantity(${product.id}, -1)"
                                class="px-4 py-2 hover:bg-gray-100 transition">

                                -

                            </button>

                            <span class="px-4 font-medium">
                                ${quantity}
                            </span>

                            <button
                                onclick="updateQuantity(${product.id}, 1)"
                                class="px-4 py-2 hover:bg-gray-100 transition">

                                +

                            </button>

                        </div>

                        <button
                            onclick="removeItem(${product.id})"
                            class="text-red-500 hover:text-red-600 font-medium">

                            Remove

                        </button>

                    </div>

                </div>

            </div>
        `;

    }).join("");

    document.getElementById("subtotal").textContent =
        `₹${subtotal}`;

    document.getElementById("total").textContent =
        `₹${subtotal}`;
}

// Make functions available to inline onclick
window.removeItem = removeItem;
window.updateQuantity = updateQuantity;

// Initial Render
renderCart();

const checkoutBtn =
    document.getElementById("checkoutBtn");

checkoutBtn?.addEventListener("click", () => {

    const cart = getCart();

    if (cart.length === 0) {

        alert("Your cart is empty");

        return;
    }

    // Later this will call your backend payment API

    showCheckoutSuccess();
});

function showCheckoutSuccess() {

    showToast("✓ Order Placed Successfully");

    // Clear cart
    localStorage.removeItem("cart");

    // Update navbar badge
    window.dispatchEvent(
        new Event("cartUpdated")
    );

    // Re-render page
    renderCart();
}

function showToast(message) {

    const toast = document.createElement("div");

    toast.className =
        "fixed top-6 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50";

    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
}