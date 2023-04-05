const PORT = 5000;
const express = require("express");
const path = require("path");
const ejs = require("ejs");
const bcrypt = require("bcrypt");
const passport = require("passport");


const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

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

let app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "./assets")));

app.get("/", (req, res) => {
    return res.render("templates");
});

app.get("/login", (req, res) => {

    return res.render("templates/authentication.ejs", {
        page: "../pages/login.ejs",
        title: "Login",
    });
    // return res.render("pages/login.ejs");
});

app.get("/logout", (req, res) => {

    return res.render("templates/authentication.ejs", {
        page: "../pages/logout.ejs",
        title: "Login",
    });
    // return res.render("pages/login.ejs");
});

app.get("/register", (req, res) => {
    return res.render("templates/authentication.ejs", {
        page: "../pages/registration.ejs",
        title: "Login",
    });
});

app.post("/register", async (req, res) => {
    //console.log(req);
    try {
        const hashedPassword = await bcrypt.hash(req.body.user_password, 10);
        users.push({
            id: Date.now().toString(),
            name: req.body.username,
            email: req.body.user_email,
            password: hashedPassword
        });
        res.redirect('/login');

    } catch {
        res.redirect('/login')
    }
    console.log(users);
});

app.post("/login", (req, res) => {
  //  console.log(req);
})

app.get("/users", (req, res) => {
    //return res.render("pages/users.ejs");
    return res.render("templates/index.ejs", {
        page: "../pages/users.ejs",
        title: "Users",
    })
});

//testing code, delete after
app.get("/hi/:personName/:personLastName", (req, res) => {
    const name = req.params.personName;
    const lastName = req.params.personLastName;
    return res.render("templates", { data: { name, lastName } });
});

app.listen(PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
});

