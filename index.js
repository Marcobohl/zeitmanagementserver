const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");

const app = express();
app.use(bodyParser());

// Nodemailer Einstellungen
var transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: 'rest.timewatch@gmail.com',
        pass: 'abchpejusfeiiwcv'
    }
});

// server ist gestartet rückmeldung
app.listen(3000, () => {
    console.log("Server started ...");
    console.log("Stop server with STRG + c")
});

// Mysql Einstellungen
const connection = mysql.createConnection({
    host: "localhost",
    user: "zeitmanagmentdb",
    password: "test",
    database: "zeitmanagmentdb"
});

// Mysql Connaction Test
connection.connect((err) => {
    if (err) throw err;
    console.log("Connected successfully to MySql server")
});

// Resetcode anfordern
function resetcode() {
    let codecheck = 1;
    let code = 1;

    while (codecheck != 0) {
        code = Math.floor(Math.random() * 900000) + 100000;
        codecheck = codeexist(code);
    }
    return code;
}

// Reset Code check in der mysql Datenbank
function codeexist(code) {
    let randomid = 0;
    let query = `SELECT EXISTS(SELECT resetcode from zeitmanagmentdb WHERE resetcode="`+ code +`")as code;`;

    connection.query(query, (err, result) => {

        if (result[0].code === 0 ) {
            randomid = 1;
        }

    });
    return randomid;
}

// E-Mail eingabe Check
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

// Password eingabe Check
function validatepassword(password) {
    let errors = [];
    if (password.length == 0) {
        errors.push("Last Name Is Null");
    }
    return errors;
}

// Password erstellen check
function passwordrestcheck(password, password2) {

    let errors = [];
    var format = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

    // Password und Password confirm gleich
    if (password2 != password) {
        errors.push("TMSB:1004");
    }

    // password nicht null
    if (password.length == 0) {
        errors.push("TMSB:1001");
    }

    //password über 8 zeichen
    if (password.length <= 8) {
        errors.push("TMSB:1002");
    }

    //password hat sondertzeichen
    if (!format.test(password)) {
        errors.push("TMSB:1003");
    }

    return errors;
}

async function hash(password) {
    const salt = await bcrypt.genSalt(10);

    const password2 = await bcrypt.hash(password, salt);
    return password2;
}

// login System
app.post("/api/login",async (req, res) => {

    let email = req.body.email;
    let password = req.body.password;
    let sesssioncode = "";

    let errEmail = validateEmail(email);
    let errpassword = validatepassword(password);

    if (errEmail.length || errpassword.length) {
        res.json(200, {
            msg: "TMS:1010",
            errors: {
                password: errpassword,
                email: errEmail
            }
        });
    }
    else {

        let query = `SELECT EXISTS(SELECT email from zeitmanagmentdb WHERE email="`+ email +`")as email;`;

        connection.query(query, (err, result) => {

            if (result[0].email === 0 ) {

                res.json(200, {
                    msg: "TMS:1003",

                });
            } else {

                query = `SELECT \`password\` from zeitmanagmentdb WHERE email=` + `"` + email + `"`;

                connection.query(query, async (err, result) => {

                    if (await bcrypt.compare(password, result[0].password)) {

                        query = `SELECT \`sessoincode\` from zeitmanagmentdb WHERE email=` + `"` + email + `"`;

                        connection.query(query, async (err, result) => {

                            sesssioncode = result[0].sessoincode;

                            res.json(200, {
                                msg: "TMS:1001",
                                code: {
                                    sessioncode: sesssioncode,
                                    semail: email
                                }
                            })

                        });

                    } else {
                        res.json(200, {
                            msg: "TMS:1002",
                        })
                    }

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
    }
});

// Reset code erstellen und E-Mail senden an den entsprechenden Nutzer
app.post("/api/reset", (req, res) => {
    let email = req.body.email;

    let errEmail = validateEmail(email);

    if (errEmail.length) {
        res.json(200, {
            msg: "TMS:1004",
        });
    } else {
        var mailOptions = {
            from: 'rest.timewatch@gmail.com',
            to: email,
            subject: 'TimeWatch - Passwort Zurücksetzen',
            text: '1 Test'
        };

        let query = `SELECT EXISTS(SELECT email from zeitmanagmentdb WHERE email="`+ email +`")as email;`;

        connection.query(query, (err, result) => {
            console.log(result[0].email);

            if (result[0].email === 0 ) {

                res.json(200, {
                    msg: "TMS:1005",

                });
            } else {

                const code = resetcode();
                mailOptions.text = "Ihre Persönliche Reset URL lautet: http://localhost:8080/Login/reset/" + code;

                let query = `UPDATE zeitmanagmentdb SET resetcode="` + code + `" WHERE email="`+ email +`";`;

                connection.query(query, (err, result) => {

                });

                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                    } else {

                        res.json(200, {
                            msg: "TMS:1005",
                        });
                    }
                });
            }
        });
    }


});

// reset code Abfrage für die Reset seite.
app.post("/api/reset/code", (req, res) => {
    let code = req.body.code;

    let query = `SELECT EXISTS(SELECT resetcode from zeitmanagmentdb WHERE resetcode="`+ code +`")as code;`;

    connection.query(query, (err, result) => {

        if (result[0].code === 0 ) {

            res.json(200, {
                msg: "TMS:1006",
            });
        } else {
            res.json(200, {
                msg: "TMS:1007",
            });
        }

    });

});

// password reset
app.post("/api/reset/code/password",async (req, res) => {

    let password = req.body.password;
    let passwordconfirm = req.body.passwordconfirm;
    let code = req.body.code;
    let email = "";

    const error = passwordrestcheck(password, passwordconfirm)

    if (error.length != "") {
        res.json(200, {
            msg: "TMS:1008",
        });
    } else {

            let salt = await bcrypt.genSalt(10);

            const password2 = await bcrypt.hash(password, salt);

            let sesssioncode = "";

            // set New Password
            let query = `UPDATE zeitmanagmentdb SET password="` + password2 + `" WHERE resetcode="`+ code +`";`;
            connection.query(query, (err, result) => {
            });

            // get email
            query = `SELECT email from zeitmanagmentdb WHERE resetcode="` + code + `"`;
            connection.query(query, (err, result) => {
                sesssioncode = result[0].email + password;

                email = result[0].email;
             });

            sesssioncode = await bcrypt.hash(sesssioncode, salt);


            // set Sessioncode
            query = `UPDATE zeitmanagmentdb SET sessoincode= "` + sesssioncode + `" WHERE resetcode="`+ code +`";`;
            connection.query(query, (err, result) => {
            });

            //cnage restcode
            query = `UPDATE zeitmanagmentdb SET resetcode= "" WHERE resetcode="`+ code +`";`;
            connection.query(query, (err, result) => {
            });


            res.json(200, {
                msg: "TMS:1009",
                code: {
                    sessioncode: sesssioncode,
                    semail: email
                    }
                });

    }
});

//login with code
app.post("/api/login/logincode",async (req, res) => {

    let scode = req.body.scode;
    let email = "";

    if (scode === null) {
        res.json(200, {
            msg: "TMS:1011",
        });
    } else {
        let query = `SELECT EXISTS(SELECT sessoincode from zeitmanagmentdb WHERE sessoincode="`+ scode +`")as code;`;
        connection.query(query, (err, result) => {

            if (result[0].code === 0 ) {
                res.json(200, {
                    msg: "TMS:1013",
                });
            } else {

                query = `SELECT email from zeitmanagmentdb WHERE sessoincode="` + scode + `"`;
                connection.query(query, (err, result) => {

                    email = result[0].email;

                    res.json(200, {
                        msg: "TMS:1012",
                        code: {
                            semail: email
                        }
                    });

                });
            }

        });
    }
});

//admincheck
app.post("/api/admincheck",async (req, res) => {

    let email = req.body.mail;
    let query = `SELECT admin from zeitmanagmentdb WHERE email="` + email + `"`;

    connection.query(query, (err, result) => {

        if (result[0].admin === 1) {
            res.json(200, {
                msg: "TMS:1014",
            });
        }

    });

});

//verwaltungcheck
app.post("/api/verwaltungcheck",async (req, res) => {

    let email = req.body.mail;
    let query = `SELECT verwaltung from zeitmanagmentdb WHERE email="` + email + `"`;

    connection.query(query, (err, result) => {

        if (result[0].verwaltung === 1) {
            res.json(200, {
                msg: "TMS:1015",
            });
        }

    });

});

//username get
app.post("/api/username",async (req, res) => {
    let email = req.body.mail;
    let query = `SELECT vorname from zeitmanagmentdb WHERE email="` + email + `"`;
    let name = "";

    connection.query(query, (err, result) => {

            name = result[0].vorname;

            res.json(200, {
                msg: "TMS:1016",
                data: {
                    name: name
                }
            });
    });
});

//login with code admin
app.post("/api/login/logincode/admin",async (req, res) => {

    let scode = req.body.scode;
    let email = "";
    let admin = "0";

    if (scode === null) {
        res.json(200, {
            msg: "TMS:1011",
        });
    } else {
        let query = `SELECT EXISTS(SELECT sessoincode from zeitmanagmentdb WHERE sessoincode="`+ scode +`")as code;`;
        connection.query(query, (err, result) => {

            if (result[0].code === 0 ) {
                res.json(200, {
                    msg: "TMS:1013",
                });
            } else {

                query = `SELECT email from zeitmanagmentdb WHERE sessoincode="` + scode + `"`;
                connection.query(query, (err, result) => {

                    email = result[0].email;

                    query = `SELECT admin from zeitmanagmentdb WHERE sessoincode="` + scode + `"`;
                    connection.query(query, (err, result) => {

                        if (result[0].admin === 1) {
                            admin = "1";
                        }

                        res.json(200, {
                            msg: "TMS:1012",
                            code: {
                                semail: email,
                                admin: admin
                            }

                    });

                    });

                });
            }

        });
    }
});
