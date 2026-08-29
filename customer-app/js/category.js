import { getProducts } from "../services/productservice.js";
import { createProductCard } from "../components/productCard.js";


const params = new URLSearchParams(
    window.location.search
);

const category = params.get("category");


const categoryTitle =
    document.getElementById("categoryTitle");

const productsGrid =
    document.getElementById("productsGrid");

const loading =
    document.getElementById("loading");

const searchInput =
    document.getElementById("searchInput");

const backBtn =
    document.getElementById("backBtn");


let products = [];


// =========================================
// SET CATEGORY TITLE
// =========================================

if (category) {

    categoryTitle.textContent = category;

} else {

    categoryTitle.textContent = "Products";

}


// =========================================
// BACK BUTTON
// =========================================

backBtn.addEventListener("click", () => {

    window.location.href = "products.html";

});


// =========================================
// LOAD CATEGORY PRODUCTS
// =========================================

async function loadCategoryProducts() {

    if (!category) {

        productsGrid.innerHTML = `
            <div class="col-span-full text-center text-red-500">
                Category not specified.
            </div>
        `;

        return;

    }


    try {

        loading.classList.remove("hidden");


        // IMPORTANT:
        // Send category to backend

        products = await getProducts(
            `?category=${encodeURIComponent(category)}&limit=50`
        );


        console.log(
            "Products for category:",
            category,
            products
        );


        renderProducts(products);

    }

    catch (error) {

        console.error(
            "Category products error:",
            error
        );


        productsGrid.innerHTML = `
            <div class="col-span-full text-center text-red-500">
                Failed to load products.
            </div>
        `;

    }

    finally {

        loading.classList.add("hidden");

    }

}


// =========================================
// RENDER PRODUCTS
// =========================================

function renderProducts(productList) {

    productsGrid.innerHTML = "";


    if (!productList || productList.length === 0) {

        productsGrid.innerHTML = `
            <div class="col-span-full text-center py-20">

                <p class="text-xl text-gray-500">
                    No products found in this category.
                </p>

            </div>
        `;

        return;

    }


    productList.forEach(product => {

        productsGrid.insertAdjacentHTML(
            "beforeend",
            createProductCard(product)
        );

    });

}


// =========================================
// SEARCH WITHIN CATEGORY
// =========================================

searchInput.addEventListener(
    "input",
    () => {

        const searchTerm =
            searchInput.value
                .toLowerCase()
                .trim();


        const filteredProducts =
            products.filter(product => {

                return (
                    product.name
                        ?.toLowerCase()
                        .includes(searchTerm)

                    ||

                    product.brand_name
                        ?.toLowerCase()
                        .includes(searchTerm)
                );

            });


        renderProducts(filteredProducts);

    }
);


// =========================================
// START
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    loadCategoryProducts
);