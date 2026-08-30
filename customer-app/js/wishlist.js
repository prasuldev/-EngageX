const container = document.getElementById("wishlist-container");
const countElement = document.getElementById("wishlist-saved-count");

async function getWishlist() {
    const response = await authFetch(`${API_BASE}/wishlist`, { method: "GET" });
    if (!response || !response.ok) return [];
    return await response.json();
}

async function removeFromWishlist(id) {
    const response = await authFetch(`${API_BASE}/wishlist/${id}`, { method: "DELETE" });
    if (!response) return;

    window.dispatchEvent(new Event("wishlistUpdated"));
    renderWishlist();
}

async function moveToCart(product) {
    const addResponse = await authFetch(`${API_BASE}/cart/add`, {
        method: "POST",
        body: JSON.stringify({ product_id: product.id, quantity: 1 })
    });

    if (!addResponse || !addResponse.ok) {
        alert("Failed to move item to cart");
        return;
    }

    await authFetch(`${API_BASE}/wishlist/${product.id}`, { method: "DELETE" });

    window.dispatchEvent(new Event("cartUpdated"));
    window.dispatchEvent(new Event("wishlistUpdated"));
    renderWishlist();
}

async function renderWishlist() {
    const wishlist = await getWishlist();

    if (countElement) {
        countElement.textContent = `${wishlist.length} Saved Items`;
    }

    if (wishlist.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                <div class="text-6xl mb-4">💖</div>
                <h2 class="text-3xl font-bold mb-3">Your Wishlist is Empty</h2>
                <p class="text-gray-500 mb-8">Save products you love and find them here.</p>
                <a href="products.html" class="bg-pink-600 text-white px-6 py-3 rounded-lg">Explore Products</a>
            </div>
        `;
        return;
    }

    container.innerHTML = wishlist.map(product => `
        <div class="bg-white rounded-2xl shadow-sm border hover:shadow-lg transition overflow-hidden w-full">
            <div class="h-48 bg-gray-100 flex items-center justify-center text-6xl">
                ${product.image_url ? `<img src="${product.image_url}" class="w-full h-full object-cover">` : "📦"}
            </div>
            <div class="p-5">
                <p class="text-sm text-gray-500 uppercase">${product.brand || "Brand"}</p>
                <h3 class="font-semibold text-lg mt-1">${product.name}</h3>
                <p class="text-pink-600 font-bold text-xl mt-3">₹${product.price}</p>

                <div class="flex gap-3 mt-5">
                    <button data-id="${product.id}" class="moveToCartBtn flex-1 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700">
                        Move to Cart
                    </button>
                    <button data-id="${product.id}" class="removeBtn px-4 border rounded-lg hover:bg-red-50 text-red-500">
                        🗑
                    </button>
                </div>
            </div>
        </div>
    `).join("");

    container.querySelectorAll(".moveToCartBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const product = wishlist.find(p => p.id === id);
            if (product) moveToCart(product);
        });
    });

    container.querySelectorAll(".removeBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            removeFromWishlist(parseInt(btn.dataset.id));
        });
    });
}

renderWishlist();