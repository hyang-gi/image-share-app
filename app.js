/* Loading env variables */

if (process.env.NODE_ENV != "production") {
    const dotenv = require("dotenv");
    dotenv.config();
}

/* Initialising variables */

const avatarImages = ["a1.png", "a2.png", "a3.png", "a4.png", "a5.png", "a6.png", "a7.png"];

/* Initialising modules */

const PORT = 5000;
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("flash");
const session = require("express-session");
const bodyParser = require("body-parser");

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


async function getUserByEmail(email) {
    console.log(email);
    const [rows, fields] = await connection.promise().query('SELECT * FROM users WHERE user_email = ?', [email]);
    console.log(rows[0]);
    return rows[0];
};

const initializePassport = require('./passport-config');
initializePassport(
    passport,
    // email => users.find(user => user.email === email),
    // id => users.find(user => user.id === id)
    email => getUserByEmail(email),
);


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


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/* Check for user object */

app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});



/* Authentication GET requests */

app.get("/", (req, res) => {
    return res.render("templates", { uploadDisplay: true });
});

app.get("/upload", (req, res) => {
    console.log("upload route works!");
    return res.render("templates", {
        page: "../pages/uploadImage.ejs",
        title: "Upload Image",
        uploadDisplay: false
    });
})

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
        const { user_display_name, username, user_email, user_bio } = req.body;
        const hashedPassword = await bcrypt.hash(req.body.user_password, 10);
        const user_password = hashedPassword;
        
        const randomIndex = Math.floor(Math.random() * avatarImages.length);
        const user_image = avatarImages[randomIndex];
        const user_image_path = `/images/avatar/${user_image}`;

        const user = { user_display_name, username, user_email, user_password, user_bio, user_image_path };
        console.log("User details from req", user);
        
        connection.query("INSERT INTO users SET ?", user, (err, results) => {
            if (err) {
                console.error(err);
                // res.status(500).send("Error creating user");
                return res.redirect("/register");
            } else {
                console.log("User created successfully!", results);
                return res.redirect('/login');
            }
        });

    } catch {
        console.log("There's an error in account creation process, redirecting to /register");
        res.redirect('/register');
    }
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
    connection.query('SELECT * FROM users', (error, results) => {
        if (error) {
            throw error;
        }
        console.log("users go here", results);
        return res.render("templates/index.ejs", {
            page: "../pages/users.ejs",
            title: "Users",
            uploadDisplay: true,
            users: results
        });
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

