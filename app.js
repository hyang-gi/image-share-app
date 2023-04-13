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
const { v4: uuidv4 } = require('uuid');

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
    fileUpload()
);


/* Check for user object */

app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

/* Landing page GET request */

app.get("/", async (req, res) => {
    try {
        const [results] = await connection.promise().query('SELECT * FROM vw_image_interaction_summaries ORDER BY image_uploaded_on DESC');
        console.log("fetched images go here", results);
        return res.render("templates/index.ejs", {
            page: "../pages/posts.ejs",
            title: "Posts",
            isProfilePage: false,
            isUsersPage: false,
            uploadDisplay: true,
            images: results
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('templates', {
            title: 'Sorry, Server Error',
            uploadDisplay: false,
            isProfilePage: false,
            isUsersPage: false,
        });
    }
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
        title: "Register",
    });
});

app.get("/logout", (req, res) => {

    return res.render("templates/authentication.ejs", {
        page: "../pages/logout.ejs",
        title: "Logout",
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
    let errorMessage;
    //console.log("Request details from /register", req);
    try {
        let { user_display_name, username, user_email, user_bio } = req.body;

        if (req.body.user_password.length < 8) {
            errorMessage = "Password must be at least 8 characters"
            req.flash('error', errorMessage);
            return res.redirect("/register");
        }

        const hashedPassword = await bcrypt.hash(req.body.user_password, 10);
        const user_password = hashedPassword;

        const randomIndex = Math.floor(Math.random() * avatarImages.length);
        const user_image = avatarImages[randomIndex];
        const user_image_path = `/images/avatar/${user_image}`;

        if (user_bio == '') {
            user_bio = "Looking for information on this user? Error 404!";
        }

        const user = { user_display_name, username, user_email, user_password, user_bio, user_image_path };
        console.log("User details from req", user);

        connection.query("INSERT INTO users SET ?", user, (err, results) => {
            if (err) {
                console.error("Unable to add user details in database", err);
                if (err.sqlMessage.includes('user_email')) {
                    errorMessage = "This email is already in use.";
                }
                if (err.sqlMessage.includes('username')) {
                    errorMessage = "This username is not available.";
                }
                req.flash('error', errorMessage);
                return res.redirect("/register");
            } else {
                console.log("User created successfully!", results);
                return res.redirect('/login');
            }
        });

    } catch (e) {
        console.log("There's an error in account creation process, redirecting to /register", e);
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

app.get("/upload", checkAuthenticated, (req, res) => {
    console.log("upload route works!");
    return res.render("templates", {
        page: "../pages/uploadImage.ejs",
        title: "Upload Image",
        uploadDisplay: false,
        isProfilePage: false,
        isUsersPage: false,
    });
});


app.get("/profile", checkAuthenticated, async (req, res) => {
    const getUser = req.user.user_email;
    const getUsername = req.user.username;
    console.log("getUser for /profile", getUser);

    //used of nested queries removed to use await statements based on Ben's suggestion for code-optimisation
    try {
        const [user_results] = await connection.promise().query('SELECT * FROM users WHERE user_email = ?', [getUser]);
        const [images] = await connection.promise().query('SELECT * FROM vw_image_interaction_summaries WHERE image_uploaded_by = ?', [getUsername]);

        console.log("images go here", images);
        return res.render("templates/index.ejs", {
            page: "../pages/profile.ejs",
            title: "Profile",
            uploadDisplay: true,
            isProfilePage: true,
            isUsersPage: false,
            user: user_results[0],
            images: images
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('templates', {
            title: 'Sorry, Server Error',
            uploadDisplay: false,
            isProfilePage: false,
            isUsersPage: false,
        });
    }
});

//#To-Do: Try catch for connection.promise, myFaultPage render

app.get("/users", checkAuthenticated, async (req, res) => {
    //return res.render("pages/users.ejs");
    try {
        const [results, fields] = await connection.promise().query('SELECT * FROM users');
        console.log("users go here", results);
        return res.render("templates/index.ejs", {
            page: "../pages/users.ejs",
            title: "Users",
            isProfilePage: false,
            isUsersPage: true,
            uploadDisplay: true,
            users: results
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('templates', {
            title: 'Sorry, Server Error',
            uploadDisplay: false,
            isProfilePage: false,
            isUsersPage: false,
        });
    }
});

//Future Work: both queries can be launcehd at once, wait for all the promises to resolve, the queries happen in order rn;

app.get("/users/:username/posts", checkAuthenticated, async (req, res) => {
    const username = req.params.username;
    console.log("username for /users/username", username);
    const [results] = await connection.promise().query('SELECT * FROM users WHERE username = ?', [username]);
    console.log("user details", results[0]);
    const [updated_images] = await connection.promise().query('SELECT * FROM vw_image_interaction_summaries WHERE image_uploaded_by = ?', [username]);
    console.log(updated_images);
    return res.render("templates/index.ejs", {
        page: "../pages/profile.ejs",
        title: "User Posts",
        uploadDisplay: true,
        isProfilePage: true,
        isUsersPage: false,
        user: results[0],
        images: updated_images
    });
});

// TO-DO: add checkAuthenticated 
app.get("/posts/:post_id", async (req, res) => {
    const post_id = req.params.post_id;
    console.log("post id GET REQ", post_id);
    try {
        const [img_results] = await connection.promise().query('SELECT * FROM vw_image_interaction_summaries WHERE image_display_id = ?', [post_id]);
        const [comments] = await connection.promise().query('SELECT * FROM interactions WHERE interaction_img_id = ?', [post_id]);
        console.log("image results", img_results);
        return res.render("templates/index.ejs", {
            page: "../pages/viewPost.ejs",
            title: "View Post",
            uploadDisplay: true,
            isProfilePage: false,
            isUsersPage: false,
            image: img_results[0],
            comments: comments
        });
    } catch (err) {
        console.log(err);
        res.status(500).render('templates', {
            title: 'Sorry, Server Error',
            uploadDisplay: false,
            isProfilePage: false,
            isUsersPage: false,
        });
    }
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

            const db_image_path = `/uploads/resized/${image.name}`;
            const uniqueId = uuidv4();
            const display_id = Date.now() + uniqueId;

            const images = {
                image_caption: img_details.caption,
                image_alt_text: img_details.alt_text,
                image_path: db_image_path,
                image_uploaded_by: username,
                image_display_id: display_id
            };
            console.log({ images });
            connection.query("INSERT INTO images SET ?", images, (err, results) => {
                if (err) {
                    console.error("Unable to add user details in database", err);
                    return res.redirect("/upload");
                } else {
                    console.log("Post uploaded successfully!", results);
                    return res.redirect("/");
                }
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

/* Add Comment POST Request */

app.post("/comment", checkAuthenticated, async (req, res) => {
    const { post_id, type, comment } = req.body;

    if (comment.trim() === '') {
        return res.redirect(`/posts/${post_id}?error=Comment cannot be empty`);
    }

    const comments = {
        interaction_img_id: post_id,
        interaction_type: type,
        interaction_text: comment,
        interaction_by: req.user.username
    };
    console.log("comment post block:", comments);
    try {
        const [results] = await connection.promise().query("INSERT INTO interactions SET ?", comments);
        console.log("Comment added successfully!", results);
        return res.redirect(`/posts/${post_id}`);

    } catch (err) {
        console.log(err);
        res.status(500).render('templates', {
            title: 'Sorry, Server Error',
            uploadDisplay: false,
            isProfilePage: false,
            isUsersPage: false,
        });
    }
});

/* Like POST Request */


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

