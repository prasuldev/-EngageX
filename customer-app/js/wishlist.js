const container =
    document.getElementById("wishlist-container");

const countElement =
    document.getElementById("wishlist-count");

function getWishlist() {

    return JSON.parse(
        localStorage.getItem("wishlist") || "[]"
    );
}

function saveWishlist(wishlist) {

    localStorage.setItem(
        "wishlist",
        JSON.stringify(wishlist)
    );

    window.dispatchEvent(
        new Event("wishlistUpdated")
    );
}

function removeFromWishlist(id) {

    const wishlist = getWishlist();

    const updatedWishlist =
        wishlist.filter(
            item => item.id !== id
        );

    saveWishlist(updatedWishlist);

    renderWishlist();
}

function moveToCart(product) {

    const cart = JSON.parse(
        localStorage.getItem("cart") || "[]"
    );

    const exists = cart.find(
        item => item.id === product.id
    );

    if (!exists) {

        cart.push({
            ...product,
            quantity: 1
        });

        localStorage.setItem(
            "cart",
            JSON.stringify(cart)
        );
    }

    removeFromWishlist(product.id);

    window.dispatchEvent(
        new Event("cartUpdated")
    );
    window.dispatchEvent(
        new Event("wishlistUpdated")
    );
}

function renderWishlist() {

    const wishlist = getWishlist();

    if (countElement) {

        countElement.textContent =
            `${wishlist.length} Saved Items`;
    }

    if (wishlist.length === 0) {

        container.innerHTML = `

            <div class="col-span-full text-center py-20">

                <div class="text-6xl mb-4">
                    💖
                </div>

                <h2 class="text-3xl font-bold mb-3">
                    Your Wishlist is Empty
                </h2>

                <p class="text-gray-500 mb-8">
                    Save products you love and find them here.
                </p>

                <a
                    href="products.html"
                    class="bg-pink-600 text-white px-6 py-3 rounded-lg">

                    Explore Products

                </a>

            </div>

        `;

        return;
    }

    container.innerHTML = wishlist.map(product => `

        <div
            class="bg-white rounded-2xl shadow-sm border hover:shadow-lg transition overflow-hidden w-full">

            <div
                class="h-48 bg-gray-100 flex items-center justify-center text-6xl">

                📦

            </div>

            <div class="p-5">

                <p class="text-sm text-gray-500 uppercase">

                    ${product.brand_name || "Brand"}

                </p>

                <h3 class="font-semibold text-lg mt-1">

                    ${product.name}

                </h3>

                <p class="text-pink-600 font-bold text-xl mt-3">

                    ₹${product.price}

                </p>

                <div class="flex gap-3 mt-5">

                    <button
                        onclick="moveToCart(${product.id})"
                        class="flex-1 bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700">

                        Move to Cart

                    </button>

                    <button
                        onclick="removeFromWishlist(${product.id})"
                        class="px-4 border rounded-lg hover:bg-red-50 text-red-500">

                        🗑

                    </button>

                </div>

            </div>

        </div>

    `).join("");
}

window.removeFromWishlist = removeFromWishlist;

window.moveToCart = (id) => {

    const wishlist = getWishlist();

    const product = wishlist.find(
        item => item.id === id
    );

    if (product) {
        moveToCart(product);
    }
};

renderWishlist();