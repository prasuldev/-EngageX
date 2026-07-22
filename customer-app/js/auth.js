const USERS_KEY = "users";
const SESSION_KEY = "loggedInUser";

/* -------------------------------
   Get All Users
-------------------------------- */

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

/* -------------------------------
   Save Users
-------------------------------- */

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/* -------------------------------
   Find User
-------------------------------- */

function getUserByEmail(email) {
    const users = getUsers();

    return users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );
}

/* -------------------------------
   Register User
-------------------------------- */

function registerUser(fullname, email, password) {

    const users = getUsers();

    if (getUserByEmail(email)) {
        return {
            success: false,
            message: "Email already exists."
        };
    }

    const user = {
        id: Date.now(),
        fullname,
        email,
        password
    };

    users.push(user);

    saveUsers(users);

    return {
        success: true,
        message: "Registration successful."
    };
}

/* -------------------------------
   Login
-------------------------------- */

function loginUser(email, password) {

    const user = getUserByEmail(email);

    if (!user) {
        return {
            success: false,
            message: "User not found."
        };
    }

    if (user.password !== password) {
        return {
            success: false,
            message: "Incorrect password."
        };
    }

    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(user)
    );

    return {
        success: true
    };
}