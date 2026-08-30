if (!isLoggedIn()) {
    window.location.href = "login.html";
}

const user = getLoggedInUser();

const editModal = document.getElementById("editProfileModal");
const editBtn = document.getElementById("editProfileBtn");
const closeEditModal = document.getElementById("closeEditModal");
const editForm = document.getElementById("editProfileForm");

if (user) {
    const username = document.getElementById("username");
    const email = document.getElementById("email");

    if (username) {
        username.textContent = user.full_name || "";
    }

    if (email) {
        email.textContent = user.email || "";
    }
}

/* Edit Profile */
if (editBtn && editModal) {
    editBtn.addEventListener("click", () => {
        if (user) {
            document.getElementById("editName").value = user.full_name || "";
            document.getElementById("editEmail").value = user.email || "";
        }

        editModal.classList.remove("hidden");
    });
}

if (closeEditModal && editModal) {
    closeEditModal.addEventListener("click", () => {
        editModal.classList.add("hidden");
    });
}

window.addEventListener("click", (e) => {
    if (e.target === editModal) {
        editModal.classList.add("hidden");
    }
});

if (editForm) {
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const full_name = document.getElementById("editName").value.trim();
        const email = document.getElementById("editEmail").value.trim();

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
            alert(data.detail || "Unable to update profile.");
            return;
        }

        document.getElementById("username").textContent = data.full_name;
        document.getElementById("email").textContent = data.email;

        saveSession(getToken(), data);

        alert("Profile updated successfully.");

        editModal.classList.add("hidden");
    });
}
