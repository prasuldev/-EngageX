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

function removeItem(id) {

    const updatedCart = getCart().filter(
        item => item.id !== id
    );

    saveCart(updatedCart);

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

    renderCart();
}

function renderCart() {

    const cart = getCart();

    if (cart.length === 0) {

        cartContainer.innerHTML = `
            <div class="bg-white p-10 rounded-xl text-center">

                <h2 class="text-2xl font-semibold mb-4">
                    Your cart is empty
                </h2>

                <a
                    href="products.html"
                    class="text-pink-600 font-medium">

                    Continue Shopping

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

            <div
                class="bg-white rounded-xl shadow-md p-6 flex gap-6">

                <div
                    class="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-3xl">

                    📦

                </div>

                <div class="flex-1">

                    <h3 class="text-xl font-semibold">
                        ${product.name}
                    </h3>

                    <p class="text-gray-500">
                        ${product.brand_name || ""}
                    </p>

                    <p class="text-pink-600 font-bold mt-2">
                        ₹${product.price}
                    </p>

                    <div class="flex items-center gap-3 mt-4">

                        <button
                            onclick="updateQuantity(${product.id}, -1)"
                            class="px-3 py-1 border rounded">

                            -

                        </button>

                        <span>
                            ${quantity}
                        </span>

                        <button
                            onclick="updateQuantity(${product.id}, 1)"
                            class="px-3 py-1 border rounded">

                            +

                        </button>

                    </div>

                </div>

                <button
                    onclick="removeItem(${product.id})"
                    class="text-red-500">

                    Remove

                </button>

            </div>

        `;
    }).join("");

    document.getElementById("subtotal").textContent =
        `₹${subtotal}`;

    document.getElementById("total").textContent =
        `₹${subtotal}`;
}

window.removeItem = removeItem;
window.updateQuantity = updateQuantity;

renderCart();
