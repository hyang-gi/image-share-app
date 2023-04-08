/* Loading env variables */

if (process.env.NODE_ENV != "production") {
    const dotenv = require("dotenv");
    dotenv.config();
}

/* Initialising other variables */

const avatarImages = ["a1.png", "a2.png", "a3.png", "a4.png", "a5.png", "a6.png", "a7.png"];
const acceptedTypes = ["image/gif", "image/jpeg", "image/png"];

/* Initialising modules */

const PORT = 5000;
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const sharp = require("sharp");
const fs = require("fs");

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
        console.error("There's an error in db connection", err);
    } else {
        console.log("Database Status: Connected.", `Error? ${err}`);
    }
}


async function getUserByEmail(email) {
    console.log(email);
    const [rows, fields] = await connection.promise().query('SELECT * FROM users WHERE user_email = ?', [email]);
    console.log("Fetched user in getUserByEmail method", rows[0]);
    return rows[0];
};

const initializePassport = require('./passport-config');
initializePassport(
    passport,
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

app.use(
    fileUpload({
        limits: {
            fileSize: 2000000, // Around 2MB
        },
        abortOnLimit: true,
        limitHandler: fileTooBig,
    })
);

/* Check for user object */

app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

/* Landing page GET request */

app.get("/", (req, res) => {
    return res.render("templates", {
        title: "Posts",
        page: "../pages/home.ejs",
        uploadDisplay: true,
        isProfilePage: false,
        isUsersPage: false,
    });
});

/* Authentication GET requests */

app.get("/upload", checkAuthenticated, (req, res) => {
    console.log("upload route works!");
    return res.render("templates", {
        page: "../pages/uploadImage.ejs",
        title: "Upload Image",
        uploadDisplay: false,
        isProfilePage: false,
        isUsersPage: false,
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
    //console.log("Request details from /register", req);
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
                console.error("Unable to add user details in database", err);
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

app.get("/profile", checkAuthenticated, (req, res) => {
    const getUser = req.user.user_email;
    console.log("getUser for /profile", getUser);
    connection.query('SELECT * FROM users WHERE user_email = ?', [getUser], (error, results) => {
        if (error) {
            console.log("Unable to get user", error);
            throw error;
        }
        console.log("user details", results[0]);
        return res.render("templates/index.ejs", {
            page: "../pages/profile.ejs",
            title: "Profile",
            uploadDisplay: true,
            isProfilePage: true,
            isUsersPage: false,
            user: results[0]
        });
    });
});

app.get("/users", checkAuthenticated, (req, res) => {
    //return res.render("pages/users.ejs");
    connection.query('SELECT * FROM users', (error, results) => {
        if (error) {
            throw error;
        }
        console.log("users go here", results);
        return res.render("templates/index.ejs", {
            page: "../pages/users.ejs",
            title: "Users",
            isProfilePage: false,
            isUsersPage: true,
            uploadDisplay: true,
            users: results
        });
    })
});


app.get("/users/:username/posts", (req, res) => {
    const username = req.params.username;
    console.log("username for /users/username", username);
    connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
        if (error) {
            console.log("Unable to get user", error);
            throw error;
        }
        console.log("user details", results[0]);
        return res.render("templates/index.ejs", {
            page: "../pages/profile.ejs",
            title: "User Posts",
            uploadDisplay: true,
            isProfilePage: true,
            isUsersPage: false,
            user: results[0]
        });
    });
});

/* Upload Post Request */

app.post("/upload", checkAuthenticated, async (req, res) => {
    const username = req.user.username;
    const image = req.files.pic;
    const img_details = req.body;
    console.log({ img_details });
    image.name = Date.now() + image.name;

    if (acceptedTypes.indexOf(image.mimetype) >= 0) {
        const imageDestinationPath = __dirname + "/assets/uploads/" + image.name;
        const resizedImagePath =
            __dirname + "/assets/uploads/resized/" + image.name;

        console.log(image);

        await image.mv(imageDestinationPath).then(async () => {
            try {
                await sharp(imageDestinationPath)
                    .resize(600)
                    .toFile(resizedImagePath)
                    .then(() => {
                        fs.unlink(imageDestinationPath, function (err) {
                            if (err) throw err;
                            console.log(imageDestinationPath + " deleted");
                        });
                    });
            } catch (error) {
                console.log(error);
            }

            const images = {
                image_name: img_details.title,
                image_caption: img_details.caption,
                image_alt_text: img_details.alt_text,
                image_path: resizedImagePath,
                image_uploaded_by: username
            };
            console.log({ images });
            // connection.query("INSERT INTO images SET ?", images, (err, results) => {
            //     if (err) {
            //         console.error("Unable to add user details in database", err);
            //         return res.redirect("/upload");
            //     } else {
            //         console.log("Post uploaded successfully!", results);
            //         return res.render("templates", {
            //             page: "../pages/posts.ejs",
            //             title: "Posts",
            //             image: "/uploads/resized/" + image.name,
            //             image_name: image.name,
            //             img_title: img_details.image_title,
            //             caption: img_details.image_caption,
            //             alt: img_details.image_alt_text,
            //             isProfilePage: false,
            //             isUsersPage: false,
            //             uploadDisplay: true,

            //         });
            //     }
            // });
            return res.render("templates", {
                page: "../pages/posts.ejs",
                title: "Posts",
                image: "/uploads/resized/" + image.name,
                image_name: image.name,
                img_title: img_details.image_title,
                caption: img_details.image_caption,
                alt: img_details.image_alt_text,
                isProfilePage: false,
                isUsersPage: false,
                uploadDisplay: true,

            });
        });
    } else {
        console.log("failed to upload else condition");
        return res.render("templates", {
            messages: { error: "You call that an image?" },
            page: "../pages/uploadImage.ejs",
            title: "Upload Image",
            uploadDisplay: false,
            isProfilePage: false,
            isUsersPage: false,
        });
    }
});


function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function fileTooBig(req, res, next) {
    console.log("File too big block!");
    return res.render("templates", {
        user: req.user,
        messages: { error: "File size exceeds 2MB!" },
        page: "../pages/uploadImage.ejs",
        title: "Upload Image",
        isProfilePage: false,
        isUsersPage: false,
        uploadDisplay: false,
    });
}

/* Define display for undefined routes */

app.use((req, res, next) => {
    res.status(404).render('templates', {
        title: 'Error',
        uploadDisplay: false,
        isProfilePage: false,
        isUsersPage: false,
    });
});

/* Setup Server */

app.listen(PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
});

