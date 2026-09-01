const cartContainer = document.getElementById("cart-items");
const addressPicker = document.getElementById("addressPicker");
const COD_CHARGE = 30.00;
const PLATFORM_FEE = 12.00;

let selectedAddressId = null;

async function getCart() {
    const response = await authFetch(`${API_BASE}/cart`, { method: "GET" });
    if (!response || !response.ok) return [];
    return await response.json();
}

async function removeItem(productId) {
    const response = await authFetch(`${API_BASE}/cart/${productId}`, { method: "DELETE" });
    if (!response) return;
    window.dispatchEvent(new Event("cartUpdated"));
    renderCart();
}

async function updateQuantity(productId, currentQty, change) {
    const newQty = currentQty + change;

    if (newQty <= 0) {
        removeItem(productId);
        return;
    }

    const response = await authFetch(`${API_BASE}/cart/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity: newQty })
    });

    if (!response) return;
    window.dispatchEvent(new Event("cartUpdated"));
    renderCart();
}

async function loadAddresses() {
    const response = await authFetch(`${API_BASE}/addresses`, { method: "GET" });
    if (!response || !response.ok) return [];
    return await response.json();
}

function renderAddressPicker(addresses) {
    if (addresses.length === 0) {
        addressPicker.innerHTML = `<p class="text-gray-400 text-sm">No saved addresses yet.</p>`;
        selectedAddressId = null;
        return;
    }

    const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
    selectedAddressId = defaultAddr.id;

    addressPicker.innerHTML = addresses.map(addr => `
        <label class="flex items-start gap-2 p-3 border rounded-lg cursor-pointer ${addr.id === selectedAddressId ? 'border-pink-500 bg-pink-50' : 'border-gray-200'}">
            <input type="radio" name="deliveryAddress" value="${addr.id}" ${addr.id === selectedAddressId ? "checked" : ""}>
            <span class="text-sm">
                <strong>${addr.full_name}</strong><br>
                ${addr.address_line1}, ${addr.city}, ${addr.state} ${addr.pincode}
            </span>
        </label>
    `).join("");

    addressPicker.querySelectorAll('input[name="deliveryAddress"]').forEach(input => {
        input.addEventListener("change", (e) => {
            selectedAddressId = parseInt(e.target.value);
        });
    });
}

let selectedProductIds = new Set();

async function renderCart() {
    const cart = await getCart();

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div class="text-6xl mb-4">🛒</div>
                <h2 class="text-3xl font-bold mb-3">Your cart is empty</h2>
                <p class="text-gray-500 mb-8">Explore our beauty collection and discover your next favorite product.</p>
                <a href="products.html" class="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition">Shop Now</a>
            </div>
        `;
        document.getElementById("subtotal").textContent = "₹0";
        document.getElementById("codCharge").textContent = "₹0";
        document.getElementById("total").textContent = "₹0";
        selectedProductIds.clear();
        return;
    }

    // Keep selections that are still valid; default to "all selected" the first time
    // this cart's items appear (e.g. right after page load).
    const currentIds = new Set(cart.map(item => item.id));
    selectedProductIds = new Set([...selectedProductIds].filter(id => currentIds.has(id)));
    if (selectedProductIds.size === 0) {
        cart.forEach(item => selectedProductIds.add(item.id));
    }

    const selectAllHtml = `
        <label class="flex items-center gap-2 px-2 pb-2">
            <input type="checkbox" id="selectAllItems" ${selectedProductIds.size === cart.length ? "checked" : ""}>
            <span class="text-sm text-gray-600">Select all</span>
        </label>
    `;

    const itemsHtml = cart.map(item => `
        <div class="bg-white rounded-2xl shadow-sm border p-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div class="flex items-center gap-5">
                    <input type="checkbox" class="item-select w-5 h-5" data-id="${item.id}"
                        ${selectedProductIds.has(item.id) ? "checked" : ""}>
                    <div class="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden">${productVisualMarkup(item)}</div>
                    <div>
                        <h3 class="text-xl font-semibold">${item.name}</h3>
                        <p class="text-pink-600 font-bold text-lg mt-2">₹${item.price}</p>
                    </div>
                </div>
                <div class="flex items-center gap-6">
                    <div class="flex items-center border rounded-lg overflow-hidden">
                        <button onclick="updateQuantity(${item.id}, ${item.quantity}, -1)" class="px-4 py-2 hover:bg-gray-100 transition">-</button>
                        <span class="px-4 font-medium">${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, ${item.quantity}, 1)" class="px-4 py-2 hover:bg-gray-100 transition">+</button>
                    </div>
                    <button onclick="removeItem(${item.id})" class="text-red-500 hover:text-red-600 font-medium">Remove</button>
                </div>
            </div>
        </div>
    `).join("");

    cartContainer.innerHTML = selectAllHtml + itemsHtml;

    document.getElementById("selectAllItems").addEventListener("change", (e) => {
        selectedProductIds = e.target.checked ? new Set(cart.map(i => i.id)) : new Set();
        renderCart();
    });

    document.querySelectorAll(".item-select").forEach(cb => {
        cb.addEventListener("change", (e) => {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) selectedProductIds.add(id);
            else selectedProductIds.delete(id);
            renderCart();
        });
    });

    const selectedItems = cart.filter(item => selectedProductIds.has(item.id));
    const subtotal = selectedItems.reduce((sum, item) => sum + item.total, 0);
    const cod = selectedItems.length > 0 ? COD_CHARGE : 0;
    const platformFee = selectedItems.length > 0 ? PLATFORM_FEE : 0;

    document.getElementById("subtotal").textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById("codCharge").textContent = `₹${cod.toFixed(2)}`;
    document.getElementById("platformFee").textContent = `₹${platformFee.toFixed(2)}`;
    document.getElementById("total").textContent = `₹${(subtotal + cod + platformFee).toFixed(2)}`;

    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
        checkoutBtn.disabled = selectedItems.length === 0;
        checkoutBtn.classList.toggle("opacity-50", selectedItems.length === 0);
    }

    const addresses = await loadAddresses();
    renderAddressPicker(addresses);
}

document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
    if (!selectedAddressId) {
        alert("Please add or select a delivery address before checking out.");
        return;
    }

    if (selectedProductIds.size === 0) {
        alert("Please select at least one item to buy.");
        return;
    }

    const response = await authFetch(`${API_BASE}/orders/place`, {
        method: "POST",
        body: JSON.stringify({
            address_id: selectedAddressId,
            payment_method: "COD",
            product_ids: [...selectedProductIds]
        })
    });

    if (!response) return;

    const data = await response.json();

    if (!response.ok || !data.success) {
        alert(data.message || data.detail || "Failed to place order");
        return;
    }

    window.dispatchEvent(new Event("cartUpdated"));
    window.location.href = `orders.html?id=${data.order_id}`;
});

window.removeItem = removeItem;
window.updateQuantity = updateQuantity;

renderCart();
