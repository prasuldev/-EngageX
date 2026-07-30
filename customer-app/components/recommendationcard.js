export function createRecommendationCard(product) {

    return `

    <div class="bg-white rounded-xl shadow p-4 mt-4">

        <img
            src="${product.image}"
            class="w-full h-40 object-cover rounded-lg">

        <h4 class="font-semibold mt-3">

            ${product.name}

        </h4>

        <p class="text-pink-600 font-bold">

            ₹${product.price}

        </p>

        <p>

            ⭐ ${product.rating}

        </p>

        <a
            href="../pages/product.html?id=${product.id}"
            class="inline-block mt-3 bg-pink-600 text-white px-4 py-2 rounded-lg">

            View Product

        </a>

    </div>

    `;

}