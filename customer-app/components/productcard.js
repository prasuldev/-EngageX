export function createProductCard(product) {

    return `

        <div class="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden">

            <div class="w-full h-64 bg-gray-100 flex items-center justify-center">
                <div class="text-7xl">📦</div>
            </div>

            <div class="p-5">

                <h3 class="text-lg font-semibold mb-2">
                    ${product.name}
                </h3>

                <p class="text-gray-500 text-sm">
                    ${product.brand_name || "Unknown Brand"}
                </p>

                <div class="flex justify-between items-center mt-3">

                    <span class="text-pink-600 font-bold text-xl">
                        ₹${product.price}
                    </span>

                    <span class="text-yellow-500">
                        ⭐ ${product.rating ?? "N/A"}
                    </span>

                </div>

                <div class="flex gap-3 mt-5">

                    <a
                        href="product.html?id=${product.id}"
                        class="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-center py-2 rounded-lg">

                        View Details

                    </a>

                    <button
                        class="wishlistBtn border rounded-lg px-3"
                        data-id="${product.id}">

                        ❤

                    </button>

                </div>

            </div>

        </div>

    `;
}