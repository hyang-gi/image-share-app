const express = require("express");
const path = require("path");
const PORT = 5000;

const app = express();

app.get("/", (req, res) => {
res.send("Welcome!");
})

app.listen(PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
})

