/* Loading env variables */ 

if (process.env.NODE_ENV != "production") {
    const dotenv = require("dotenv");
    dotenv.config();
}

/* Initialising modules */ 

const PORT = 5000;
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("flash");
const session = require("express-session");

const initializePassport = require('./passport-config');
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

/* Configuring database set up */ 

const mysql = require("mysql2");

const DBCONFIG = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

let connection = mysql.createConnection(DBCONFIG);
connection.connect(onConnectionReady);

function onConnectionReady(err) {
    if (err != null) {
        console.error(err);
    } else {
        console.log("connection ready!", `Error? ${err}`);
    }
}

const users = [];

/* Middleware set up */ 

let app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));
app.use(express.static(path.join(__dirname, "./assets")));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
    return res.render("templates");
});

/* Authentication GET requests */ 

app.get("/login", (req, res) => {

    return res.render("templates/authentication.ejs", {
        page: "../pages/login.ejs",
        title: "Login",
    });
    //return res.render("pages/login.ejs");
});

app.get("/register", (req, res) => {
    return res.render("templates/authentication.ejs", {
        page: "../pages/registration.ejs",
        title: "Login",
    });
});

app.get("/logout", (req, res) => {

    return res.render("templates/authentication.ejs", {
        page: "../pages/logout.ejs",
        title: "Login",
    });
    // return res.render("pages/login.ejs");
});


/* Authentication POST requests */ 

app.post("/login", passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
}));

app.post("/register", async (req, res) => {
    //console.log(req);
    try {
        const hashedPassword = await bcrypt.hash(req.body.user_password, 10);
        users.push({
            id: Date.now().toString(), //automatically gen in database
            name: req.body.user_display_name,
            username: req.body.username,
            email: req.body.user_email,
            password: hashedPassword
        });
        res.redirect('/login');
    } catch {
        res.redirect('/register')
    }
    console.log(users, "account created");
});

/* Delete Logged In Session */

app.post('/logout', function (req, res, next) {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/logout');
    });
});

/* Other Routes */ 

app.get("/users", (req, res) => {
    //return res.render("pages/users.ejs");
    return res.render("templates/index.ejs", {
        page: "../pages/users.ejs",
        title: "Users",
    })
});

/* Testing Code, Delete Soon  

app.get("/hi/:personName/:personLastName", (req, res) => {
    const name = req.params.personName;
    const lastName = req.params.personLastName;
    return res.render("templates", { data: { name, lastName } });
});

*/

/* Setup Server */ 

app.listen(PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
});

