export function createRecommendationCard(product) {

    return `

    <div class="bg-white rounded-xl shadow-md p-4 mt-4 border border-pink-100">

        <div class="flex justify-between items-start">

            <div>

                <p class="text-xs text-pink-600 font-semibold">

                    ${product.brand || "Maquillage"}

                </p>

                <h4 class="font-semibold text-gray-800 mt-1">

                    ${product.name}

                </h4>

                <p class="text-sm text-gray-500">

                    ${product.category}

                </p>

            </div>

            <div class="text-yellow-500">

                ⭐ ${product.rating}

            </div>

        </div>

        <div class="flex justify-between items-center mt-4">

            <p class="text-pink-600 font-bold text-lg">

                ₹${product.price}

            </p>

            <a
                href="../pages/product.html?id=${product.id}"
                class="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700">

                View

            </a>

        </div>

    </div>

    `;
}