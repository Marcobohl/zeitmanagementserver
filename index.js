const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    host: "mail.time-watch.eu",
    port: 465,
    secure: false,
    auth: {
        user: 'info@time-watch.eu',
        pass: 'mv&5O10v4'
    }
});

const app = express();
app.use(bodyParser());

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


function sissoncode() {
    return Math.floor(Math.random() * 900000) + 100000;
}

function validateEmail(email) {
    let errors = [];

    // checks whether email is empty or not
    if (email.length == 0) {
        errors.push("Email Is Null");
    }

    // checks whether email length is more then 100 or not
    if (email.length > 100) {
        errors.push("Email Can not exceed 100 Character");
    }


    // checks whether email is valid or not usinf regular expression
    if (!(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/g.test(email))) {
        errors.push("Email Is Not Valid");
    }
    return errors;
}

function validatepassword(password) {
    let errors = [];
    if (password.length == 0) {
        errors.push("Last Name Is Null");
    }
    return errors;
}

app.post("/api/login", (req, res) => {
    console.log("Requesey..	");
    let email = req.body.email;
    let password = req.body.password;
    console.log(email);
    console.log(password);

    let errEmail = validateEmail(email);
    let errpassword = validatepassword(password);

    if (errEmail.length || errpassword.length) {
        res.json(200, {
            msg: "Validation Failed",
            errors: {
                password: errpassword,
                email: errEmail
            }
        });
    }
    else {

        let query = `SELECT EXISTS(SELECT email from zeitmanagmentdb WHERE email="`+ email +`")as email;`;

        connection.query(query, (err, result) => {
            console.log(result[0].email);

            if (result[0].email === 0 ) {
                console.log("Falschemail");

                res.json(200, {
                    msg: "TMS:1003",

                });
            }
        });



        query = `SELECT \`password\` from zeitmanagmentdb WHERE email=` + `"` + email + `"`;
        connection.query(query, (err, result) => {

            Object.keys(result).forEach(function(key) {
                var row = result[key];
                console.log("Password:"+ row.password)

                if (password === row.password) {
                    console.log("Richtig");

                    res.json(200, {
                        msg: "TMS:1001",

                    })


                } else {
                    console.log("Falsch");
                    res.json(200, {
                        msg: "TMS:1002",
                    })
                }
            });

            if (err) {
                // status code 500 is for Internal Server Error
                res.json(500, {
                    msg: "Some thing went wrong please try again"
                })
            }

            // if we reach till this point means record is inserted succesfully
        })

    }
});


app.post("/api/reset", (req, res) => {
    console.log("Requesey..	");
    let email = req.body.email;
    console.log(email);

    let errEmail = validateEmail(email);

    if (errEmail.length) {
        console.log("a")
        res.json(200, {
            msg: "TMS:1004",
        });
    } else {
        var mailOptions = {
            from: 'info@time-watch.eu',
            to: email,
            subject: 'TimeWatch - Passwort Zurücksetzen',
            text: '1 Test'
        };

        let query = `SELECT EXISTS(SELECT email from zeitmanagmentdb WHERE email="`+ email +`")as email;`;

        connection.query(query, (err, result) => {
            console.log(result[0].email);

            if (result[0].email === 0 ) {
                console.log("Falschemail");

                res.json(200, {
                    msg: "TMS:1005",

                });
            } else {

                mailOptions.text = "Ihr Passwort Reset Code Lautet: " + sissoncode();

                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);

                        res.json(200, {
                            msg: "TMS:1005",
                        });
                    }
                });
            }
        });
    }


});

// https://medium.com/@vrajshah01/form-processing-using-vue-js-and-node-js-c5b32ea0ba44
