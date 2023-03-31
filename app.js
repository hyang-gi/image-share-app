const express = require("express");
const path = require("path");
const ejs = require("ejs");
const PORT = 5000;

let app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));
app.use(express.static(path.join(__dirname, "./assets")));

app.get("/", (req, res) => {
    return res.render("templates") });

app.get("/login", (req, res) => {
    return res.render("pages/login.ejs");
});

app.get("/register", (req, res) => {
    return res.render("pages/registration.ejs");
});


app.get("/hi/:personName/:personLastName", (req, res) => {
    const name = req.params.personName;
    const lastName = req.params.personLastName;
    return res.render("templates", { data: { name, lastName } });
  });

app.listen(PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
});

