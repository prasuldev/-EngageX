if (!isLoggedIn()) {
    window.location.href = "login.html";
}

const user = getLoggedInUser();
const passwordModal = document.getElementById("passwordModal");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const closeModal = document.getElementById("closeModal");
const editModal = document.getElementById("editProfileModal");
const editBtn = document.getElementById("editProfileBtn");
const closeEditModal = document.getElementById("closeEditModal");

if (user) {
    document.getElementById("username").textContent = user.full_name;
    document.getElementById("email").textContent = user.email;
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    logoutUser();
    window.location.href = "login.html";
});

changePasswordBtn.addEventListener("click", () => {
    passwordModal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
    passwordModal.classList.add("hidden");
});

window.addEventListener("click", (e) => {
    if (e.target === passwordModal) {
        passwordModal.classList.add("hidden");
    }
});

document.getElementById("changePasswordForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    const response = await authFetch(`${API_BASE}/auth/change-password`, {
        method: "PUT",
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    });

    if (!response) return;

    const data = await response.json();

    if (!response.ok) {
        alert(data.detail);
        return;
    }

    alert("Password changed successfully.");

    passwordModal.classList.add("hidden");

    document.getElementById("changePasswordForm").reset();

});

editBtn.addEventListener("click", () => {

    document.getElementById("editName").value = user.full_name;
    document.getElementById("editEmail").value = user.email;

    editModal.classList.remove("hidden");

});

closeEditModal.addEventListener("click", () => {
    editModal.classList.add("hidden");
});

window.addEventListener("click", (e) => {

    if (e.target === editModal) {
        editModal.classList.add("hidden");
    }

});

document.getElementById("editProfileForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const full_name = document.getElementById("editName").value;
    const email = document.getElementById("editEmail").value;

    const response = await authFetch(`${API_BASE}/auth/profile`, {

        method: "PUT",

        body: JSON.stringify({
            full_name,
            email
        })

    });

    if (!response) return;

    const data = await response.json();

    if (!response.ok) {
        alert(data.detail);
        return;
    }

    document.getElementById("username").textContent = data.full_name;
    document.getElementById("email").textContent = data.email;

    saveSession(getToken(), data);

    alert("Profile updated successfully");

    editModal.classList.add("hidden");

});