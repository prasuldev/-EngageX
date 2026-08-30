const API_BASE = "https://engagex-3.onrender.com";

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    throw new Error("Invalid email or password");
  }

  const data = await res.json(); // { access_token, token_type, user }

  if (!["admin", "marketing_manager"].includes(data.user.role)) {
    throw new Error("This portal is for staff accounts only.");
  }

  localStorage.setItem("internal_token", data.access_token);
  localStorage.setItem("internal_user", JSON.stringify(data.user));

  return data.user.role;
}

function getInternalToken() {
  return localStorage.getItem("internal_token");
}

function getInternalUser() {
  const raw = localStorage.getItem("internal_user");
  return raw ? JSON.parse(raw) : null;
}

function requireAuth() {
  if (!getInternalToken()) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function requireRole(allowedRoles) {
  const user = getInternalUser();
  if (!user || !allowedRoles.includes(user.role)) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem("internal_token");
  localStorage.removeItem("internal_user");
  window.location.href = "index.html";
}

const form = document.getElementById("login-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("error-msg");
    errorEl.textContent = "";
    try {
      const role = await login(
        document.getElementById("email").value,
        document.getElementById("password").value
      );
      window.location.href = role === "admin" ? "admin.html" : "dashboard.html";
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}
