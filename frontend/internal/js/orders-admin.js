const ORDER_STATUS_SEQUENCE = ["Pending", "Confirmed", "Shipped", "Delivered"];
const TERMINAL_STATUSES = ["Delivered", "Cancelled"];
const RETURN_WINDOW_DAYS = 7;

let currentOrderStatusFilter = "";
let currentOrderId = null;

async function apiPut(path, body) {
    const token = localStorage.getItem("internal_token");
    const response = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        let detail = `API error: ${response.status}`;
        try {
            const err = await response.json();
            detail = err.detail || detail;
        } catch (_) { /* not JSON */ }
        throw new Error(detail);
    }
    return await response.json();
}

async function loadOrders(status = "") {
    const tbody = document.querySelector("#orders-table tbody");
    tbody.innerHTML = `<tr><td colspan="6">Loading orders...</td></tr>`;

    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const liveRows = await apiGet(`/admin/orders${query}`);
    const rows = liveRows?.length ? liveRows : getDashboardPreviewData().orders
        .filter(order => !status || order.status === status);

    if (!rows) {
        tbody.innerHTML = `<tr><td colspan="6">Couldn't load orders.</td></tr>`;
        return;
    }

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6">No orders found.</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(order => {
        const date = new Date(order.created_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
        });
        
        return `
            <tr>
                <td>${formatOrderNumber(order.id, order.created_at)}</td>
                <td>${order.full_name || "—"}</td>
                <td>${date}</td>
                <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                <td>${getReturnExchangeCell(order)}</td>
                <td>₹${Number(order.total_amount).toFixed(2)}</td>
                <td><button class="btn-secondary view-order-btn" data-order-id="${order.id}">View</button></td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll(".view-order-btn").forEach(btn => {
        btn.addEventListener("click", () => openOrderDetail(parseInt(btn.dataset.orderId)));
    });
}

async function openOrderDetail(orderId) {
    currentOrderId = orderId;
    document.getElementById("order-detail-modal").classList.remove("hidden");
    document.getElementById("order-detail-body").innerHTML = `<p class="empty-state">Loading...</p>`;

    const data = await apiGet(`/admin/orders/${orderId}`);
    if (!data || !data.success) {
        document.getElementById("order-detail-body").innerHTML = `<p class="empty-state">Order not found.</p>`;
        return;
    }

    renderOrderDetail(data);
}

function renderOrderDetail(data) {
    const order = data.order;
    const itemsHtml = data.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₹${Number(item.price).toFixed(2)}</td>
            <td>₹${Number(item.subtotal).toFixed(2)}</td>
        </tr>
    `).join("");

    const returnHtml = data.return_request ? `
        <div class="return-request-block">
            <h3 class="subsection-title" style="padding:0 0 10px;">
                ${data.return_request.request_type === "return" ? "Return" : "Exchange"} Request
            </h3>
            <p class="order-detail-meta">Status: <span class="status-badge">${data.return_request.status}</span></p>
            <p class="order-detail-meta">Reason: ${data.return_request.reason || "—"}</p>
            <div id="return-update-row"></div>
        </div>
    ` : "";

    document.getElementById("order-detail-body").innerHTML = `
        <h3 class="subsection-title" style="padding:0 0 14px;">${formatOrderNumber(order.id, order.created_at)}</h3>
        <p class="order-detail-meta">Status: <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></p>
        <p class="order-detail-meta">Total: ₹${Number(order.total_amount).toFixed(2)}</p>
        <p class="order-detail-meta">Customer: ${order.full_name || "—"} · ${order.phone || "—"}</p>
        <p class="order-detail-meta">${order.address_line1 || ""}${order.address_line2 ? ", " + order.address_line2 : ""}</p>
        <p class="order-detail-meta">${order.city || ""}, ${order.state || ""} ${order.pincode || ""}</p>

        <table class="order-items-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        ${returnHtml}
        <div class="status-update-row" id="status-update-row"></div>
    `;

    renderStatusControls(order.status);
    if (data.return_request) renderReturnControls(data.return_request.status);
}

function renderStatusControls(currentStatus) {
    const row = document.getElementById("status-update-row");

    if (TERMINAL_STATUSES.includes(currentStatus)) {
        row.innerHTML = `<p class="order-detail-meta">This order is ${currentStatus} and cannot be updated further.</p>`;
        return;
    }

    const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(currentStatus);
    const nextOptions = ORDER_STATUS_SEQUENCE.slice(currentIndex + 1)
        .map(s => `<option value="${s}">${s}</option>`).join("");

    row.innerHTML = `
        <label class="field">
            <span>Update status</span>
            <select id="status-select">
                ${nextOptions}
                <option value="Cancelled">Cancelled</option>
            </select>
        </label>
        <button id="update-status-btn" class="btn-primary">Update</button>
    `;

    document.getElementById("update-status-btn").addEventListener("click", handleStatusUpdate);
}

async function handleStatusUpdate() {
    const newStatus = document.getElementById("status-select").value;
    const btn = document.getElementById("update-status-btn");

    btn.disabled = true;
    btn.textContent = "Updating...";

    try {
        await apiPut(`/admin/orders/${currentOrderId}/status`, { status: newStatus });
        await openOrderDetail(currentOrderId);
        loadOrders(currentOrderStatusFilter);
    } catch (error) {
        alert(error.message || "Failed to update status");
        btn.disabled = false;
        btn.textContent = "Update";
    }
}

function closeOrderDetail() {
    document.getElementById("order-detail-modal").classList.add("hidden");
    currentOrderId = null;
}

function initOrdersPanel() {
    loadOrders();

    document.getElementById("order-status-filter").addEventListener("change", (e) => {
        currentOrderStatusFilter = e.target.value;
        loadOrders(currentOrderStatusFilter);
    });

    document.getElementById("close-order-detail").addEventListener("click", closeOrderDetail);

    document.getElementById("order-detail-modal").addEventListener("click", (e) => {
        if (e.target.id === "order-detail-modal") closeOrderDetail();
    });
}

function formatOrderNumber(id, createdAt) {
    const date = new Date(createdAt);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `MQ-${y}${m}${d}-${String(id).padStart(6, "0")}`;
}

function renderReturnControls(currentReturnStatus) {
    const row = document.getElementById("return-update-row");
    if (!row) return;

    if (["Completed", "Rejected"].includes(currentReturnStatus)) {
        row.innerHTML = `<p class="order-detail-meta">This request is ${currentReturnStatus}.</p>`;
        return;
    }

    const options = currentReturnStatus === "Requested"
        ? `<option value="Approved">Approved</option><option value="Rejected">Rejected</option>`
        : `<option value="Completed">Completed</option>`;

    row.innerHTML = `
        <div class="status-update-row">
            <label class="field">
                <span>Update return status</span>
                <select id="return-status-select">${options}</select>
            </label>
            <button id="update-return-btn" class="btn-primary">Update</button>
        </div>
    `;

    document.getElementById("update-return-btn").addEventListener("click", handleReturnStatusUpdate);
}

async function handleReturnStatusUpdate() {
    const newStatus = document.getElementById("return-status-select").value;
    const btn = document.getElementById("update-return-btn");

    btn.disabled = true;
    btn.textContent = "Updating...";

    try {
        await apiPut(`/admin/orders/${currentOrderId}/return-status`, { status: newStatus });
        await openOrderDetail(currentOrderId);
        loadOrders(currentOrderStatusFilter);
    } catch (error) {
        alert(error.message || "Failed to update return status");
        btn.disabled = false;
        btn.textContent = "Update";
    }
}

function getReturnExchangeCell(order) {
    if (order.return_type) {
        const label = order.return_type === "return" ? "↩ Return" : "⇄ Exchange";
        return `<span class="status-badge return-badge">${label} · ${order.return_status}</span>`;
    }

    if (order.status !== "Delivered" || !order.delivered_at) {
        return `<span class="return-window-muted">—</span>`;
    }

    const deliveredAt = new Date(order.delivered_at);
    const deadline = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const msLeft = deadline - now;

    if (msLeft <= 0) {
        return `<span class="return-window-expired">No return/exchange possible</span>`;
    }

    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
    return `<span class="return-window-active">${daysLeft} day${daysLeft === 1 ? "" : "s"} left</span>`;
}
