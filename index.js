const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();

app.listen(3000, () => {
    console.log("Server started ...");
    console.log("Stop server with STRG + c")
});

app.get("/", (req, res) => {
    res.send("Hello From The Server");
})

const connection = mysql.createConnection({
    host: "localhost",
    user: "zeitmanagmentdb",
    password: "test",
    database: "zeitmanagmentdb"
});

connection.connect((err) => {
    if (err) throw err;
    console.log("Connected successfully to MySql server")
});

https://medium.com/@vrajshah01/form-processing-using-vue-js-and-node-js-c5b32ea0ba44