import { getProducts } from "../services/productService.js";
import { createProductCard } from "../components/productCard.js";

const loading = document.getElementById("loading");
const grid = document.getElementById("productsGrid");

let products = [];

async function loadProducts() {

    try {

        loading.classList.remove("hidden");

        products = await getProducts();

        renderProducts(products);

    }

    catch (error) {

        console.error(error);

        grid.innerHTML = `
            <div class="col-span-full text-center text-red-500">
                Failed to load products.
            </div>
        `;

    }

    finally {

        loading.classList.add("hidden");

    }

}

function renderProducts(productList) {

    grid.innerHTML = "";

    if (productList.length === 0) {

        grid.innerHTML = `
            <div class="col-span-full text-center text-gray-500">
                No products found.
            </div>
        `;

        return;

    }

    productList.forEach(product => {

        grid.insertAdjacentHTML(
            "beforeend",
            createProductCard(product)
        );

    });

}

document.addEventListener("DOMContentLoaded", loadProducts);