const SESSION_KEY = "loggedInUser";

function getLoggedInUser() {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
}

function isLoggedIn() {
    return getLoggedInUser() !== null;
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
}