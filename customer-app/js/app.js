// Load Products

async function loadProducts() {

    try {

        const response = await fetch("../data/products.json");

        const products = await response.json();

        console.log("Products Loaded");

        console.log(products);

        return products;

    }

    catch(error){

        console.error("Error Loading Products");

        console.error(error);

    }

}

function createProductCard(product){

    return `

        <div class="product-card">

            <div class="product-image">

                📦

            </div>

            <div class="product-info">

                <div class="product-brand">

                    ${product.Brand}

                </div>

                <div class="product-name">

                    ${product.Product_Name}

                </div>

                <div class="product-category">

                    ${product.Category}

                </div>

                <div class="product-rating">

                    ⭐ ${product.Rating}

                </div>

                <div class="product-price">

                    ₹ ${product.Price}

                </div>

                <a href="product.html?id=${product.Product_ID}">

                    <button class="product-btn">

                        View Details

                    </button>

                </a>

            </div>

        </div>

    `;
}

document.addEventListener("DOMContentLoaded", async ()=>{

    const products = await loadProducts();

    const container =
        document.getElementById("products-container");

    if(!container){

        console.error("products-container not found");

        return;

    }

    container.innerHTML = "";

    products
        .slice(0,12)
        .forEach(product=>{

            container.innerHTML +=
                createProductCard(product);

        });

});