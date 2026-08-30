const addressesModal = document.getElementById("addressesModal");
const addressesBtn = document.getElementById("addressesBtn");
const closeAddressesModal = document.getElementById("closeAddressesModal");
const addressList = document.getElementById("addressList");
const addressForm = document.getElementById("addressForm");
const showAddAddressFormBtn = document.getElementById("showAddAddressFormBtn");
const cancelAddressFormBtn = document.getElementById("cancelAddressFormBtn");
const addressFormSubmitBtn = document.getElementById("addressFormSubmitBtn");

addressesBtn.addEventListener("click", async () => {
    addressesModal.classList.remove("hidden");
    await loadAddresses();
});

closeAddressesModal.addEventListener("click", () => {
    addressesModal.classList.add("hidden");
    resetAddressForm();
});

window.addEventListener("click", (e) => {
    if (e.target === addressesModal) {
        addressesModal.classList.add("hidden");
        resetAddressForm();
    }
});

showAddAddressFormBtn.addEventListener("click", () => {
    resetAddressForm();
    addressForm.classList.remove("hidden");
});

cancelAddressFormBtn.addEventListener("click", () => {
    resetAddressForm();
});

function resetAddressForm() {
    addressForm.reset();
    document.getElementById("addressId").value = "";
    document.getElementById("addr_country").value = "India";
    addressForm.classList.add("hidden");
    addressFormSubmitBtn.textContent = "Save Address";
}

async function loadAddresses() {
    addressList.innerHTML = `<p class="address-list-message loading">Loading addresses...</p>`;

    const response = await authFetch(`${API_BASE}/addresses`, { method: "GET" });
    if (!response) return;

    const data = await response.json();
    if (!response.ok) {
        alert(data.detail || "Failed to load addresses");
        addressList.innerHTML = `<p class="address-list-message">Couldn't load addresses.</p>`;
        return;
    }

    renderAddresses(data);
}

function renderAddresses(addresses) {
    addressList.innerHTML = "";

    if (addresses.length === 0) {
        addressList.innerHTML = `
            <div class="address-list-message empty">
                <i class="fa-solid fa-location-dot"></i>
                No saved addresses yet.
            </div>
        `;
        return;
    }

    addresses.forEach((addr) => {
        const card = document.createElement("div");
        card.className = "address-card";

        card.innerHTML = `
            <div class="address-card-header">
                <strong>${addr.full_name}</strong>
                ${addr.is_default ? '<span class="default-badge">Default</span>' : ""}
            </div>
            <p>${addr.address_line1}${addr.address_line2 ? ", " + addr.address_line2 : ""}</p>
            <p>${addr.city}, ${addr.state} ${addr.pincode}</p>
            <p>${addr.country}</p>
            <p>${addr.phone}</p>
            <div class="address-card-actions">
                <button class="editAddressBtn">Edit</button>
                ${!addr.is_default ? '<button class="setDefaultBtn">Set as Default</button>' : ""}
                <button class="deleteAddressBtn">Delete</button>
            </div>
        `;

        card.querySelector(".editAddressBtn").addEventListener("click", () => {
            fillAddressForm(addr);
        });

        const setDefaultBtn = card.querySelector(".setDefaultBtn");
        if (setDefaultBtn) {
            setDefaultBtn.addEventListener("click", () => setDefaultAddress(addr.id));
        }

        card.querySelector(".deleteAddressBtn").addEventListener("click", () => {
            deleteAddress(addr.id);
        });

        addressList.appendChild(card);
    });
}

function fillAddressForm(addr) {
    document.getElementById("addressId").value = addr.id;
    document.getElementById("addr_full_name").value = addr.full_name;
    document.getElementById("addr_phone").value = addr.phone;
    document.getElementById("addr_line1").value = addr.address_line1;
    document.getElementById("addr_line2").value = addr.address_line2 || "";
    document.getElementById("addr_city").value = addr.city;
    document.getElementById("addr_state").value = addr.state;
    document.getElementById("addr_pincode").value = addr.pincode;
    document.getElementById("addr_country").value = addr.country;
    document.getElementById("addr_is_default").checked = addr.is_default;

    addressFormSubmitBtn.textContent = "Update Address";
    addressForm.classList.remove("hidden");
}

addressForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const addressId = document.getElementById("addressId").value;

    const payload = {
        full_name: document.getElementById("addr_full_name").value,
        phone: document.getElementById("addr_phone").value,
        address_line1: document.getElementById("addr_line1").value,
        address_line2: document.getElementById("addr_line2").value || null,
        city: document.getElementById("addr_city").value,
        state: document.getElementById("addr_state").value,
        pincode: document.getElementById("addr_pincode").value,
        country: document.getElementById("addr_country").value,
        is_default: document.getElementById("addr_is_default").checked
    };

    const url = addressId ? `${API_BASE}/addresses/${addressId}` : `${API_BASE}/addresses`;
    const method = addressId ? "PATCH" : "POST";

    const response = await authFetch(url, {
        method,
        body: JSON.stringify(payload)
    });

    if (!response) return;

    const data = await response.json();
    if (!response.ok) {
        alert(data.detail || "Failed to save address");
        return;
    }

    resetAddressForm();
    await loadAddresses();
});

async function setDefaultAddress(addressId) {
    const response = await authFetch(`${API_BASE}/addresses/${addressId}/default`, {
        method: "PATCH"
    });

    if (!response) return;

    const data = await response.json();
    if (!response.ok) {
        alert(data.detail || "Failed to set default address");
        return;
    }

    await loadAddresses();
}

async function deleteAddress(addressId) {
    if (!confirm("Delete this address?")) return;

    const response = await authFetch(`${API_BASE}/addresses/${addressId}`, {
        method: "DELETE"
    });

    if (!response) return;

    const data = await response.json();
    if (!response.ok) {
        alert(data.detail || "Failed to delete address");
        return;
    }

    await loadAddresses();
}