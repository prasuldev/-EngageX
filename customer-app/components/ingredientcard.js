export function createIngredientCard(ingredient) {

    return `

    <div class="bg-white border rounded-xl p-4 mt-4">

        <h4 class="font-semibold text-pink-600">

            ${ingredient.name}

        </h4>

        <p class="mt-2">

            ${ingredient.description}

        </p>

    </div>

    `;

}