import { getCategories } from "../services/productservice.js";

const loading = document.getElementById("loading");
const categoryGrid = document.getElementById("categoryGrid");

const categoryIcons = {
    "Cleanser": "🧼",
    "Moisturizer": "🧴",
    "Face Mask": "🎭",
    "Eye cream": "👁️",
    "Sun protect": "☀️"
};

async function loadCategories() {

    try {

        loading.classList.remove("hidden");

        const categories = await getCategories();

        renderCategories(categories);

    }

    catch (error) {

        console.error(error);

        categoryGrid.innerHTML = `
            <div class="col-span-full text-center text-red-500">
                Failed to load categories.
            </div>
        `;

    }

    finally {

        loading.classList.add("hidden");

    }

}

function renderCategories(categories) {

    const row1 =document.getElementById("categoryRow1");
    const row2 =document.getElementById("categoryRow2");

    row1.innerHTML = "";
    row2.innerHTML = "";

    categories.forEach((category,index)=>{

        const card = `
            <div class="category-card"
                data-category="${category}">

                <div class="category-icon">
                    ${categoryIcons[category] || "✦"}
                </div>

                <div class="category-name">
                    ${category}
                </div>

            </div>
        `;

        if(index < 3){
            row1.insertAdjacentHTML("beforeend",card);
        }else{
            row2.insertAdjacentHTML("beforeend",card);
        }

    });

    document.querySelectorAll(".category-card").forEach(card => {

        card.addEventListener("click", () => {

            const category =
                card.dataset.category;

            window.location.href =
                `category.html?category=${encodeURIComponent(category)}`;

        });

    });

}

document.addEventListener(
    "DOMContentLoaded",
    loadCategories
);
