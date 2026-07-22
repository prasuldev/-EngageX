if (!isLoggedIn()) {

    window.location.href = "login.html";

}

const user = getLoggedInUser();

document.getElementById("username").textContent =
    user.fullname;

document.getElementById("email").textContent =
    user.email;

document.getElementById("logoutBtn")
.addEventListener("click", () => {

    logoutUser();

    window.location.href = "login.html";

});