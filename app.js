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

const dbConnection = connection.promise();


async function getUserByEmail(email) {
    console.log(email);
    const [rows, fields] = await dbConnection.query('SELECT * FROM users WHERE user_email = ?', [email]);
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
    let authenticated_images;
    try {
        const [results] = await dbConnection.query('SELECT * FROM vw_image_interaction_summaries ORDER BY image_uploaded_on DESC');
        console.log("fetched images go here", results);
        if (req.isAuthenticated()) {
            const getUsername = req.user.username;
            const [all_liked_interactions] = await dbConnection.query(
                `SELECT *
                 FROM vw_image_interaction_summaries
                 LEFT JOIN interactions ON vw_image_interaction_summaries.image_display_id = interactions.interaction_img_id
                 WHERE interactions.interaction_by = ? AND interactions.interaction_type = '1'`,
                [getUsername]);
            console.log("all liked interactions in home", all_liked_interactions);
            authenticated_images = results.map(image => {
                const liked = all_liked_interactions.find(interaction => interaction.image_display_id === image.image_display_id);
                return {
                    ...image,
                    liked_by_user: !!liked,
                };
            });
        }
        return res.render("templates/index.ejs", {
            page: "../pages/posts.ejs",
            title: "Posts",
            isProfilePage: false,
            isUsersPage: false,
            uploadDisplay: true,
            images: req.isAuthenticated() ? authenticated_images : results
        });
    } catch (err) {
        console.log(err);
        showServerError(res);
    };
});

/* Authentication GET requests */

app.get("/login", (req, res) => {

    return res.render("templates/authentication.ejs", {
        page: "../pages/login.ejs",
        title: "Login",
    });
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
});


/* Authentication POST requests */

app.post("/login", passport.authenticate('local', {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
}));

app.post("/register", async (req, res) => {
    let errorMessage;
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
            user_bio = "Error 404! This user was too lazy to type a bio";
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

    try {
        const [user_results] = await dbConnection.query('SELECT * FROM users WHERE user_email = ?', [getUser]);
        const [image_results] = await dbConnection.query('SELECT * FROM vw_image_interaction_summaries WHERE image_uploaded_by = ? ORDER BY image_uploaded_on DESC', [getUsername]);
        const [all_liked_interactions] = await dbConnection.query(
            `SELECT *
             FROM vw_image_interaction_summaries
             LEFT JOIN interactions ON vw_image_interaction_summaries.image_display_id = interactions.interaction_img_id
             WHERE interactions.interaction_by = ? AND interactions.interaction_type = '1'`,
            [getUsername]);

        const images = image_results.map(image => {
            const liked = all_liked_interactions.find(interaction => interaction.image_display_id === image.image_display_id);
            return {
                ...image,
                liked_by_user: !!liked,
            };
        });

        console.log("images on /profile go here", images);
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
        showServerError(res);
    }
});


app.get("/users", checkAuthenticated, async (req, res) => {
    try {
        const [results, fields] = await dbConnection.query('SELECT * FROM users ORDER BY user_id DESC');
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
        showServerError(res);
    }
});

app.get("/users/:username/posts", checkAuthenticated, async (req, res) => {
    const username = req.params.username;
    console.log("username for /users/username", username);
    const loggedInUser = req.user.username;
    const [results] = await dbConnection.query('SELECT * FROM users WHERE username = ?', [username]);
    console.log("user details", results[0]);

    const [updated_images] = await dbConnection.query('SELECT * FROM vw_image_interaction_summaries WHERE image_uploaded_by = ? ORDER BY image_uploaded_on DESC', [username]);
    const [all_liked_interactions] = await dbConnection.query(
        `SELECT *
         FROM vw_image_interaction_summaries
         LEFT JOIN interactions ON vw_image_interaction_summaries.image_display_id = interactions.interaction_img_id
         WHERE interactions.interaction_by = ? AND interactions.interaction_type = '1'`,
        [loggedInUser]);

    const images = updated_images.map(image => {
        const liked = all_liked_interactions.find(interaction => interaction.image_display_id === image.image_display_id);
        return {
            ...image,
            liked_by_user: !!liked,
        };
    });
    // console.log("images obj in users/username", images);
    return res.render("templates/index.ejs", {
        page: "../pages/profile.ejs",
        title: "User Posts",
        uploadDisplay: true,
        isProfilePage: true,
        isUsersPage: false,
        user: results[0],
        images: images
    });
});

app.get("/posts/:post_id", checkAuthenticated, async (req, res) => {
    const post_id = req.params.post_id;
    const error_msg = req.query.error ? req.query.error : '';
    const username = req.user.username;
    console.log("post id GET REQ", post_id);
    try {
        const [img_results] = await dbConnection.query('SELECT * FROM vw_image_interaction_summaries WHERE image_display_id = ?', [post_id]);
        const [interactions] = await dbConnection.query('SELECT * FROM interactions WHERE interaction_img_id = ?', [post_id]);

        const liked_by_user = interactions.find(interaction => interaction.interaction_type === 1 && interaction.interaction_by === username) !== undefined;

        const timestamp = img_results[0].image_uploaded_on;
        const date = new Date(timestamp);
        const uploaded_on = date.toDateString();

        return res.render("templates/index.ejs", {
            page: "../pages/viewPost.ejs",
            title: "View Post",
            error_msg,
            uploadDisplay: true,
            isProfilePage: false,
            isUsersPage: false,
            image: img_results[0],
            interactions: interactions,
            liked_by_user,
            uploaded_on
        });
    } catch (err) {
        console.log(err);
        showServerError(res);
    }
});

/* Upload Post Request */

app.post("/upload", checkAuthenticated, async (req, res) => {
    const username = req.user.username;
    const image = req.files.pic;
    const img_details = req.body;
    console.log("request from /upload POST route", img_details);
    image.name = Date.now() + image.name;

    if (acceptedTypes.indexOf(image.mimetype) >= 0) {
        const imageDestinationPath = __dirname + "/assets/uploads/" + image.name;
        const resizedImagePath =
            __dirname + "/assets/uploads/resized/" + image.name;

        // console.log(image);

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
    // console.log("comment post block:", comments);
    try {
        const [results] = await dbConnection.query("INSERT INTO interactions SET ?", comments);
        console.log("Comment added successfully!", results);
        return res.redirect(`/posts/${post_id}`);

    } catch (err) {
        console.log(err);
        showServerError(res);
    }
});

/* Like POST Request */

app.post('/like', async (req, res) => {
    console.log("like functionality block");
    const { post_id } = req.body;
    const getUser = req.user.username;
    console.log(post_id, getUser);
    try {
        const [results] = await dbConnection.query('SELECT * FROM interactions WHERE interaction_by = ? AND interaction_img_id = ? AND interaction_type = ?', [getUser, post_id, '1']);
        if (results.length > 0) {
            await dbConnection.query('DELETE FROM interactions WHERE interaction_by = ? AND interaction_img_id = ? AND interaction_type = ?', [getUser, post_id, '1']);
        } else {
            await dbConnection.query('INSERT INTO interactions SET ?', { interaction_by: getUser, interaction_img_id: post_id, interaction_type: '1' });
        }
        return res.redirect(`/posts/${post_id}`);
    } catch (err) {
        console.log(err);
        showServerError(res);
    }
})

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function showServerError(res) {
    res.status(500).render('templates', {
        title: 'Error',
        errorPage: "../pages/serverError.ejs",
        uploadDisplay: false,
        isProfilePage: false,
        isUsersPage: false,
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

app.listen(process.env.PORT || PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
});

