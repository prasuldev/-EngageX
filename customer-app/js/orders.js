if (!isLoggedIn()) {
    window.location.href = "login.html";
}

const STATUS_STEPS = ["Pending", "Confirmed", "Shipped", "Delivered"];

const RETURN_POLICY_TEXT = `
    Returns and exchanges are accepted within 7 days of delivery, provided the item is unused
    and in its original packaging. Refunds are processed within 5-7 business days of us
    receiving the returned item. To request a return or exchange, use the button below once
    your order is marked Delivered.
`;

const REASON_TAGS = {
    low: ["Damaged product", "Not as described", "Poor quality", "Wrong item received", "Late delivery", "Bad packaging"],
    mid: ["Okay but not great", "Average quality", "Expected better packaging", "Price too high for quality"],
    high: ["Great quality", "Value for money", "Fast delivery", "As described", "Great packaging", "Would buy again"]
};

function tierFor(rating) {
    if (rating <= 2) return "low";
    if (rating === 3) return "mid";
    return "high";
}

const reviewModal = document.getElementById("reviewModal");
const starPicker = document.getElementById("starPicker");
const reasonTags = document.getElementById("reasonTags");
const submitReviewBtn = document.getElementById("submitReviewBtn");
const reviewProductName = document.getElementById("reviewProductName");

let reviewContext = null;
let reviewSelectedRating = 0;
let reviewSelectedReasons = new Set();

function openReviewModal(orderId, productId, productName) {
    reviewContext = { orderId, productId };
    reviewSelectedRating = 0;
    reviewSelectedReasons = new Set();
    reviewProductName.textContent = productName;
    renderStarPicker();
    reasonTags.innerHTML = "";
    submitReviewBtn.disabled = true;
    reviewModal.classList.remove("hidden");
}

document.getElementById("closeReviewModal").addEventListener("click", () => {
    reviewModal.classList.add("hidden");
});

window.addEventListener("click", (e) => {
    if (e.target === reviewModal) reviewModal.classList.add("hidden");
});

function renderStarPicker() {
    starPicker.innerHTML = [1, 2, 3, 4, 5].map(n => `
        <i class="fa-solid fa-star cursor-pointer star-btn" data-value="${n}"
           style="color:${n <= reviewSelectedRating ? '#d63384' : '#e5e5e5'}"></i>
    `).join("");

    starPicker.querySelectorAll(".star-btn").forEach(star => {
        star.addEventListener("click", () => {
            reviewSelectedRating = parseInt(star.dataset.value);
            reviewSelectedReasons = new Set();
            renderStarPicker();
            renderReasonTags();
            updateSubmitState();
        });
    });
}

function renderReasonTags() {
    if (!reviewSelectedRating) {
        reasonTags.innerHTML = "";
        return;
    }

    const tier = tierFor(reviewSelectedRating);

    reasonTags.innerHTML = REASON_TAGS[tier].map(tag => `
        <button type="button" class="reason-tag px-3 py-1.5 rounded-full border text-sm transition
            ${reviewSelectedReasons.has(tag) ? "bg-pink-600 text-white border-pink-600" : "bg-white text-gray-600 border-gray-300"}"
            data-tag="${tag}">${tag}</button>
    `).join("");

    reasonTags.querySelectorAll(".reason-tag").forEach(btn => {
        btn.addEventListener("click", () => {
            const tag = btn.dataset.tag;
            if (reviewSelectedReasons.has(tag)) reviewSelectedReasons.delete(tag);
            else reviewSelectedReasons.add(tag);
            renderReasonTags();
            updateSubmitState();
        });
    });
}

function updateSubmitState() {
    submitReviewBtn.disabled = !(reviewSelectedRating > 0 && reviewSelectedReasons.size > 0);
}

submitReviewBtn.addEventListener("click", async () => {
    const response = await authFetch(`${API_BASE}/reviews`, {
        method: "POST",
        body: JSON.stringify({
            order_id: reviewContext.orderId,
            product_id: reviewContext.productId,
            rating: reviewSelectedRating,
            reasons: [...reviewSelectedReasons]
        })
    });

    if (!response) return;

    const data = await response.json();

    if (!response.ok || !data.success) {
        alert(data.message || data.detail || "Failed to submit rating");
        return;
    }

    reviewModal.classList.add("hidden");
    showOrderDetail(reviewContext.orderId);
});

window.openReviewModal = openReviewModal;

const orderListView = document.getElementById("orderListView");
const orderDetailView = document.getElementById("orderDetailView");
const orderList = document.getElementById("orderList");
const orderTracker = document.getElementById("orderTracker");
const orderMeta = document.getElementById("orderMeta");
const orderItems = document.getElementById("orderItems");
const orderAddress = document.getElementById("orderAddress");
const ordersPageSubtitle = document.getElementById("ordersPageSubtitle");
const orderActions = document.getElementById("orderActions");

const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

if (orderId) {
    showOrderDetail(orderId);
} else {
    showOrderList();
}

async function showOrderList() {
    orderListView.classList.remove("hidden");
    orderDetailView.classList.add("hidden");
    ordersPageSubtitle.textContent = "My Orders";

    orderList.innerHTML = `<p class="address-list-message loading">Loading orders...</p>`;

    const response = await authFetch(`${API_BASE}/orders`, { method: "GET" });
    if (!response) return;

    const data = await response.json();
    if (!response.ok) {
        orderList.innerHTML = `<p class="address-list-message">Couldn't load orders.</p>`;
        return;
    }

    renderOrderList(data);
}

function renderOrderList(orders) {
    orderList.innerHTML = "";

    if (orders.length === 0) {
        orderList.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm p-12 text-center">
                <div class="text-6xl mb-4">📦</div>
                <h2 class="text-2xl font-bold mb-3">No orders yet</h2>
                <p class="text-gray-500 mb-8">When you place an order, it'll show up here.</p>
                <a href="products.html" class="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition">Shop Now</a>
            </div>
        `;
        return;
    }

    orders.forEach((order) => {
        const card = document.createElement("a");
        card.href = `orders.html?id=${order.id}`;
        card.className = "block bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md hover:border-pink-300 transition";

        const date = new Date(order.created_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
        });

        const eta = order.expected_delivery_date
            ? new Date(order.expected_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : null;

        card.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div class="flex items-center gap-3 mb-1">
                        <strong class="text-lg">${formatOrderNumber(order.id, order.created_at)}</strong>
                        <span class="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full status-${order.status.toLowerCase()}">${order.status}</span>
                    </div>
                    <p class="text-gray-500 text-sm">Placed on ${date}</p>
                    ${eta ? `<p class="text-gray-500 text-sm">Expected delivery: ${eta}</p>` : ""}
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold text-pink-600">₹${Number(order.total_amount).toFixed(2)}</p>
                    <span class="text-pink-600 text-sm font-medium">View Details →</span>
                </div>
            </div>
        `;

        orderList.appendChild(card);
    });
}

function renderTracker(status) {
    const stepIndex = STATUS_STEPS.indexOf(status);

    if (status === "Cancelled" || stepIndex === -1) {
        orderTracker.innerHTML = `
            <div class="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-xl font-semibold">
                <i class="fa-solid fa-circle-xmark text-xl"></i>
                <span>${status === "Cancelled" ? "Order Cancelled" : status}</span>
            </div>
        `;
        return;
    }

    orderTracker.innerHTML = `
        <div class="relative flex justify-between">
            <div class="absolute top-4 left-0 w-full h-0.5 bg-gray-200"></div>
            ${STATUS_STEPS.map((step, i) => `
                <div class="relative z-10 flex flex-col items-center flex-1">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs
                        ${i <= stepIndex ? "bg-pink-600 border-pink-600 text-white" : "bg-white border-gray-200 text-transparent"}">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <span class="text-xs font-semibold mt-2 text-center ${i <= stepIndex ? "text-pink-600" : "text-gray-400"}">
                        ${step}
                    </span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderOrderMeta(order) {
    const date = new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
    });
    const eta = order.expected_delivery_date
        ? new Date(order.expected_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "—";

    orderMeta.innerHTML = `
        <div class="flex justify-between text-gray-600"><span>Order Date</span><span>${date}</span></div>
        <div class="flex justify-between text-gray-600"><span>Expected Delivery</span><span>${eta}</span></div>
        <div class="flex justify-between text-gray-600"><span>Platform Fee</span><span>₹${Number(order.platform_fee).toFixed(2)}</span></div>
        <div class="flex justify-between text-gray-600"><span>COD Charge</span><span>₹${Number(order.cod_charge).toFixed(2)}</span></div>
        <hr class="my-2">
        <div class="flex justify-between text-lg font-bold"><span>Total</span><span class="text-pink-600">₹${Number(order.total_amount).toFixed(2)}</span></div>
    `;
}

function renderOrderItems(items, orderStatus, reviews, orderId) {
    orderItems.innerHTML = items.map(item => {
        const existing = reviews[item.id];
        let actionHtml = "";

        if (orderStatus === "Delivered") {
            if (existing) {
                actionHtml = `
                    <div class="text-xs mt-1">
                        <span class="text-pink-600">${"★".repeat(existing.rating)}${"☆".repeat(5 - existing.rating)}</span>
                        <span class="text-gray-500">${(existing.reasons || []).join(", ")}</span>
                    </div>
                `;
            } else {
                actionHtml = `
                    <button class="rate-btn text-pink-600 text-xs font-semibold mt-1 hover:underline"
                        data-product-id="${item.id}" data-product-name="${item.name}">
                        Rate this product
                    </button>
                `;
            }
        }

        return `
            <div class="flex items-center gap-4 py-4">
                <img src="${item.image_url || '../assets/placeholder.png'}" class="w-16 h-16 rounded-lg object-cover bg-gray-100">
                <div class="flex-1">
                    <p class="font-semibold">${item.name}</p>
                    <p class="text-gray-500 text-sm">Qty: ${item.quantity} × ₹${Number(item.price).toFixed(2)}</p>
                    ${actionHtml}
                </div>
                <p class="font-semibold">₹${Number(item.subtotal).toFixed(2)}</p>
            </div>
        `;
    }).join("");

    orderItems.querySelectorAll(".rate-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openReviewModal(orderId, parseInt(btn.dataset.productId), btn.dataset.productName);
        });
    });
}

function renderOrderAddress(order) {
    orderAddress.innerHTML = `
        <p class="font-semibold text-gray-800">${order.full_name}</p>
        <p>${order.address_line1}${order.address_line2 ? ", " + order.address_line2 : ""}</p>
        <p>${order.city}, ${order.state} ${order.pincode}</p>
        <p>${order.country}</p>
        <p>${order.phone}</p>
    `;
}

function renderOrderActions(orderId, order, returnRequest) {
    let actionsHtml = "";

    if (["Pending", "Confirmed"].includes(order.status)) {
        actionsHtml += `<button id="cancelOrderBtn" class="w-full py-3 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition">Cancel Order</button>`;
    }

    if (order.status === "Delivered") {
        if (returnRequest) {
            actionsHtml += `
                <div class="p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
                    ${returnRequest.request_type === "return" ? "Return" : "Exchange"} requested — Status: <strong>${returnRequest.status}</strong>
                </div>
            `;
        } else {
            actionsHtml += `<button id="returnRequestBtn" class="w-full py-3 rounded-xl bg-pink-50 text-pink-600 font-semibold hover:bg-pink-100 transition">Request Return / Exchange</button>`;
        }
    }

    actionsHtml += `
        <details class="text-sm text-gray-500 pt-2">
            <summary class="cursor-pointer font-semibold text-gray-700">Return &amp; Exchange Policy</summary>
            <p class="mt-2 leading-relaxed">${RETURN_POLICY_TEXT}</p>
        </details>
    `;

    orderActions.innerHTML = actionsHtml;

    document.getElementById("cancelOrderBtn")?.addEventListener("click", () => cancelOrder(orderId));
    document.getElementById("returnRequestBtn")?.addEventListener("click", () => openReturnPrompt(orderId));
}

async function showOrderDetail(id) {
    orderListView.classList.add("hidden");
    orderDetailView.classList.remove("hidden");
    ordersPageSubtitle.textContent = "Loading...";

    const [detailsRes, trackRes] = await Promise.all([
        authFetch(`${API_BASE}/orders/${id}`, { method: "GET" }),
        authFetch(`${API_BASE}/orders/${id}/track`, { method: "GET" })
    ]);

    if (!detailsRes || !trackRes) return;

    const details = await detailsRes.json();
    const track = await trackRes.json();

    if (!detailsRes.ok || !details.success) {
        orderDetailView.innerHTML = `<p class="address-list-message">Order not found.</p>`;
        return;
    }

    ordersPageSubtitle.textContent = formatOrderNumber(details.order.id, details.order.created_at);

    renderTracker(track.success ? track.order.status : details.order.status);
    renderOrderMeta(details.order);
    renderOrderItems(details.items, details.order.status, details.reviews || {}, id);
    renderOrderAddress(details.order);
    renderOrderActions(id, details.order, details.return_request);
}

async function cancelOrder(orderId) {
    if (!confirm("Cancel this order?")) return;

    const response = await authFetch(`${API_BASE}/orders/${orderId}/cancel`, { method: "PATCH" });
    if (!response) return;

    const data = await response.json();
    if (!response.ok) {
        alert(data.detail || "Failed to cancel order");
        return;
    }

    showOrderDetail(orderId);
}

async function openReturnPrompt(orderId) {
    const type = confirm("Click OK for Return, Cancel for Exchange") ? "return" : "exchange";
    const reason = prompt(`Reason for ${type}:`);
    if (!reason) return;

    const response = await authFetch(`${API_BASE}/orders/${orderId}/return`, {
        method: "POST",
        body: JSON.stringify({ request_type: type, reason })
    });

    if (!response) return;

    const data = await response.json();
    if (!response.ok) {
        alert(data.detail || "Failed to submit request");
        return;
    }

    showOrderDetail(orderId);
}

function formatOrderNumber(id, createdAt) {
    const date = new Date(createdAt);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `MQ-${y}${m}${d}-${String(id).padStart(6, "0")}`;
}