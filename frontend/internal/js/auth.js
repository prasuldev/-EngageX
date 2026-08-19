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

  const data = await res.json();
  const role = data.user.role;

  if (!["admin", "marketing_manager"].includes(role)) {
    throw new Error("This account does not have access to the internal dashboard");
  }

  localStorage.setItem("internal_token", data.access_token);
  localStorage.setItem("internal_user", JSON.stringify(data.user));
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
      await login(
        document.getElementById("email").value,
        document.getElementById("password").value
      );
      window.location.href = "dashboard.html";
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}