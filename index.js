const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const nodemailer = require('nodemailer');
const bcrypt = require("bcrypt");
const {compareSync} = require("bcrypt");

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


// userid
function usercode(name) {
    let codecheck = 1;
    let code = 1;
    let username = name;

    while (codecheck != 0) {
        code = Math.floor(Math.random() * 900000) + 100000;
        codecheck = useridexist(username + code);
    }
    return username + code;
}

// userid check in der mysql Datenbank
function useridexist(code) {
    let randomid = 0;
    let query = `SELECT EXISTS(SELECT userid from zeitmanagmentdb WHERE userid="`+ code +`")as code;`;

    connection.query(query, (err, result) => {

        if (result[0].code === 0 ) {
            randomid = 1;
        }

    });
    return randomid;
}



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
                mailOptions.text = "Ihre Persönliche Reset URL lautet: http://localhost:8080/login/reset/" + code;

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

//login with code admin
app.post("/api/createuser",async (req, res) => {

    let semail = req.body.email;
    let svorname = req.body.vorname;
    let snachname = req.body.nachname;
    let sverwaltung = req.body.verwaltung;
    let sadmin = req.body.admin;
    let sarbeitszeit = req.body.arbeitszeit;
    let spausenzeit = req.body.pausenzeit;
    let scode = resetcode();
    let userid = usercode(svorname)

    var mailOptions = {
        from: 'rest.timewatch@gmail.com',
        to: semail,
        subject: 'TimeWatch - Willkommen',
        text: '1 Test'
    };

    let salt = await bcrypt.genSalt(10);

    const password2 = await bcrypt.hash(semail, salt);


    let errEmail = validateEmail(semail);

    if (errEmail.length) {
        res.json(200, {
            msg: "TMS:1010",
            errors: {
                email: errEmail
            }
        });
    } else {

        let query = `SELECT EXISTS(SELECT email from zeitmanagmentdb WHERE email="`+ semail +`")as mail;`;
        connection.query(query, (err, result) => {


            if (result[0].mail === 1) {
                res.json(200, {
                    msg: "TMS:1017",
                });
            } else {

                if (sadmin === true) {
                    sadmin = 1;
                } else {
                    sadmin = 0;
                }

                if (sverwaltung === true) {
                    sverwaltung = 1;
                } else {
                    sverwaltung = 0;
                }


                    let query = `INSERT INTO zeitmanagmentdb (email, password, resetcode, sessoincode, admin, verwaltung, vorname, nachname, arbeitzeit, pause, userid) VALUES ( "` + semail + `", "` + password2 + `", "` + scode + `", null, "` + sadmin + `", "` + sverwaltung + `", "` + svorname + `", "` + snachname + `", "` + sarbeitszeit + `", "` + spausenzeit + `", "` + userid + `")`;
                    connection.query(query, (err, result) => {

                        let query = `create table ` + userid + ` ( datum date not null primary key, start bigint, ende bigint, pausestart bigint, pauseend bigint, gesamtarbeizeit bigint, gzeit bigint, gpause bigint)`;
                        connection.query(query, (err, result) => {

                            console.log(err);

                            mailOptions.text = "Herzlich Willkommen bei TimeWatch, bitte erstellen sie über ihren Persönlichen Password link ihr Password: http://localhost:8080/login/reset/" + scode;

                            transporter.sendMail(mailOptions, function(error, info){
                                if (error) {
                                } else {


                                    res.json(200, {
                                        msg: "TMS:1019",
                                    });
                                }
                            });

                        });

                    });
            }
        });

    }

});

//load user Tabels
app.get("/api/loadusertabel",async (req, res) => {


    let query = "SELECT * FROM zeitmanagmentdb";

    connection.query(query, (err, result) => {
        if (err) {
            res.json(500, {
                msg: "Internal Server Error Please Try Again"
            })
        }

        res.send(200, {
            msg: "All the data fetched successfully",
            data: result
        })
    })
});

// remove user and all tabel
app.post("/api/removeuser",async (req, res) => {
    let email = req.body.email;
    let user= req.body.user;
    let id = req.body.id;

    if (user === email) {

        res.json(200, {
            msg: "TMS:1021",
        });

    } else {

        let query = `Drop table ` + id ;
        connection.query(query, (err, result) => {

            query = `DELETE FROM zeitmanagmentdb WHERE userid = "`+ id +`";`;
            connection.query(query, (err, result) => {
                res.json(200, {
                    msg: "TMS:1020",
                });
            });

        });

    }


});

//edit user
app.post("/api/edituser",async (req, res) => {
    let email = req.body.email;
    let vorname = req.body.vorname;
    let nachname = req.body.nachname;
    let arbeitzeit = req.body.arbeitzeit;
    let pause = req.body.pause;
    let admin = req.body.admin;
    let verwaltung = req.body.verwaltung;
    let userid = req.body.userid;

    let errEmail = validateEmail(email);

    if (errEmail.length) {
        res.json(200, {
            msg: "TMS:1004",
            errors: {
                email: errEmail
            }
        });
    } else {

        if (admin === true) {
            admin = 1;
        } else {
            admin =  0
        }

        if (verwaltung === true) {
            verwaltung = 1;
        } else {
            verwaltung =  0
        }



        let query = `UPDATE zeitmanagmentdb SET email="` + email + `", vorname="` + vorname + `", nachname="` + nachname + `", arbeitzeit="` + arbeitzeit + `", pause="` + pause + `", admin=` + admin + `, verwaltung=` + verwaltung + `  WHERE userid="` + userid +`"`;
            connection.query(query, (err, result) => {
                res.json(200, {
                    msg: "TMS:1022",
                });
            });
    }
});

//pausenstart
app.post("/api/pausenstart",async (req, res) => {
    let email = req.body.email;
    let datum = req.body.datum;
    let pause = req.body.pause;

    console.log(email);
    console.log(pause);
    console.log(datum);
});

//einbuchen
app.post("/api/starttimer",async (req, res) => {
    let semail = req.body.email;
    let datum = req.body.datum;
    let starttime = req.body.starttime;
    let userids = "";


    console.log(starttime);

    let query = `SELECT userid from zeitmanagmentdb WHERE email="`+ semail + `"`;

    connection.query(query, (err, result) => {

        userids = result[0].userid;

        query = `INSERT INTO ` + userids + ` (datum, start, ende, pausestart, pauseend) VALUES ( "` + datum + `", "` + starttime + `", null, null, null)`;

        connection.query(query, (err, result) => {
        });

    });
});

app.post("/api/closeevent",async (req, res) => {
    let semail = req.body.email;
    let timer = req.body.timer;

    console.log(timer);
    console.log(semail);
});

app.post("/api/loadtimer", (req, res) => {
    let semail = req.body.email;
    let datum = req.body.datum;


    let query = `SELECT userid from zeitmanagmentdb WHERE email="`+ semail + `"`;

    connection.query(query, (err, result) => {

        userid = result[0].userid;

        query = `SELECT EXISTS(SELECT datum from `+ userid +` WHERE datum="`+ datum +`")as datums`;

        connection.query(query, (err, result) => {

            if (result[0].datums === 1) {

                query = `SELECT start from `+ userid +` WHERE datum="`+ datum + `"`;

                connection.query(query, (err, result) => {

                     console.log("a" + result[0].start)

                    if (result[0].start === null) {

                        query = `SELECT gzeit from `+ userid +` WHERE datum="`+ datum + `"`;

                        connection.query(query, (err, result) => {
                            console.log(result[0].gzeit);

                            const timer = new Date(result[0].gzeit)
                            console.log(timer);

                            res.json(200, {
                                msg: "TMS:1024",
                                data: {
                                    timer: timer.getTime(),
                                }
                            });

                        });


                    } else {

                        query = `SELECT gzeit from `+ userid +` WHERE datum="`+ datum + `"`;

                        connection.query(query, (err, result) => {

                            if (result[0].gzeit === null) {

                                query = `SELECT start from `+ userid +` WHERE datum="`+ datum + `"`;

                                connection.query(query, (err, result) => {

                                    const heute = new Date();

                                    let start = result[0].start;
                                    let aktuell = heute.getTime();

                                    var newDateObj = new Date(aktuell - start);

                                    var newtime = new Date(heute.getTime() - newDateObj.getTime())
                                    console.log(newtime);

                                    const stunde = newDateObj.getUTCHours().toString().padStart(2, '0');
                                    const minuten = newDateObj.getUTCMinutes().toString().padStart(2, '0');
                                    const sekunden = newDateObj.getUTCSeconds().toString().padStart(2, '0');


                                    let time = stunde + ":" + minuten + ":" + sekunden;

                                    res.json(200, {
                                        msg: "TMS:1023",
                                        data: {
                                            heute: newtime.getTime(),
                                            timer: time
                                        }
                                    });

                                });

                            } else {

                                let gzeit;
                                let akzeit;

                                query = `SELECT gzeit from `+ userid +` WHERE datum="`+ datum + `"`;

                                connection.query(query, (err, result) => {

                                    gzeit = result[0].gzeit;

                                    query = `SELECT start from `+ userid +` WHERE datum="`+ datum + `"`;

                                    connection.query(query, (err, result) => {

                                        akzeit = result[0].start;

                                        console.log(gzeit);
                                        console.log(akzeit);

                                        gzeit = akzeit - gzeit;
                                        console.log(gzeit);

                                        const timer = new Date(gzeit)

                                        res.json(200, {
                                            msg: "TMS:1025",
                                            data: {
                                                timer: timer.getTime(),
                                                gzeit: gzeit,
                                            }
                                        });

                                    });


                                });
                            }


                        });

                    }
                });

            }
            console.log(err)
        });
    });
});

//ausbuchen
app.post("/api/stoptimer",async (req, res) => {
    let semail = req.body.email;
    let timer = req.body.timer;

    let query = `SELECT userid from zeitmanagmentdb WHERE email="`+ semail + `"`;

    connection.query(query, (err, result) => {

        userid = result[0].userid;
        const heute = new Date(timer);
        const monat = heute.getMonth() + 1
        const datum = heute.getFullYear() + "-" + monat + "-" + heute.getDate()
        query = `SELECT start from `+ userid +` WHERE datum="`+ datum + `"`;

        connection.query(query, (err, result) => {

            let start = result[0].start;

            query = `SELECT gzeit from `+ userid +` WHERE datum="`+ datum + `"`;

            connection.query(query, (err, result) => {

                let gzeit;
                if (result[0].gzeit === undefined) {
                    gzeit = new Date(heute.getTime() - start);
                } else {
                    gzeit = new Date(heute.getTime() - start + result[0].gzeit)   ;
                }

                query = `UPDATE ` + userid + ` SET start=` + null + `, gzeit="` + gzeit.getTime() + `" WHERE datum="` + datum +`"`;

                connection.query(query, (err, result) => {
                    console.log(err);
                });
            });

        });

    });
});

//ausbuchen
app.post("/api/resumtworktimer",async (req, res) => {
    let semail = req.body.email;
    let timer = req.body.starttime;
    let datum = req.body.datum;
    let userid;

    let query = `SELECT userid from zeitmanagmentdb WHERE email="`+ semail + `"`;

    connection.query(query, (err, result) => {

        userid = result[0].userid;
        query = `UPDATE ` + userid + ` SET start="` + timer + `" WHERE datum="` + datum +`"`;

        connection.query(query, (err, result) => {
            console.log(err);

        });


    });
});

//lade die arbezietliste
app.post("/api/loadtimerlist",async (req, res) => {
    let semail = req.body.email;
    let pause = 0;
    let abzeit = 0;

    let query = `SELECT pause, arbeitzeit from zeitmanagmentdb WHERE email= "`+ semail + `"`;

    connection.query(query, (err, result) => {

        console.log(result[0].pause);
        console.log(result[0].arbeitzeit);

        pause = result[0].pause;
        abzeit = result[0].arbeitzeit;

        query = `SELECT userid from zeitmanagmentdb WHERE email="`+ semail + `"`;

        connection.query(query, (err, result) => {

            query = "SELECT * FROM "+ result[0].userid;

            connection.query(query, (err, result) => {

                res.json(200, {
                    msg: "TMS:1026",
                    data: {
                        data: result,
                    },
                    pause: {
                        pause: pause,
                    },
                    abzeit: {
                        abzeit: abzeit,
                    }
                });
            });

        });
    });
});

//ausbuchen
app.post("/api/ptimelod",async (req, res) => {
    let semail = req.body.email;

    let query = `SELECT userid from zeitmanagmentdb WHERE email="`+ semail + `"`;

    connection.query(query, (err, result) => {

        query = `SELECT pause from zeitmanagmentdb WHERE userid= "`+ result[0].userid + `"`;

        connection.query(query, (err, result) => {

            console.log(result[0].pause);


            res.json(200, {
                msg: "TMS:1027",
                data: {
                    data: result,
                }
            });
        });
    });
});

//login with code verwaltung
app.post("/api/login/logincode/verwaltung",async (req, res) => {

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

                    query = `SELECT verwaltung from zeitmanagmentdb WHERE sessoincode="` + scode + `"`;
                    connection.query(query, (err, result) => {

                        if (result[0].verwaltung === 1) {
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

//load user emails
app.get("/api/emialsload",async (req, res) => {


    let query = "SELECT email FROM zeitmanagmentdb";

    connection.query(query, (err, result) => {
        if (err) {
            res.json(500, {
                msg: "Internal Server Error Please Try Again"
            })
        }

        res.send(200, {
            msg: "All the data fetched successfully",
            data: result
        })
    })
});

//einbuchen pause
app.post("/api/pausestarttimer",async (req, res) => {
    let semail = req.body.email;
    let datum = req.body.datum;
    let starttime = req.body.starttime;
    let userids = "";


    console.log(starttime);
    console.log(datum);

    let query = `SELECT userid from zeitmanagmentdb WHERE email="`+ semail + `"`;

    connection.query(query, (err, result) => {

        userids = result[0].userid;

        query = `UPDATE ` + userid + ` SET pausestart="` + starttime + `" WHERE datum="` + datum +`"`;

        connection.query(query, (err, result) => {
        });

    });
});

//ausbuchen
app.post("/api/pausestoptimer",async (req, res) => {
    let semail = req.body.email;
    let timer = req.body.stoptimer;

    let query = `SELECT userid from zeitmanagmentdb WHERE email="`+ semail + `"`;

    connection.query(query, (err, result) => {

        userid = result[0].userid;
        const heute = new Date(timer);
        const monat = heute.getMonth() + 1
        const datum = heute.getFullYear() + "-" + monat + "-" + heute.getDate()
        query = `SELECT pausestart from `+ userid +` WHERE datum="`+ datum + `"`;

        connection.query(query, (err, result) => {

            let start = result[0].pausestart;

            query = `SELECT gpause from `+ userid +` WHERE datum="`+ datum + `"`;

            connection.query(query, (err, result) => {

                let gzeit;
                if (result[0].gzeit === undefined) {
                    gzeit = new Date(heute.getTime() - start);
                } else {
                    gzeit = new Date(heute.getTime() - start + result[0].gzeit)   ;
                }

                query = `UPDATE ` + userid + ` SET pausestart=` + null + `, gpause="` + gzeit.getTime() + `" WHERE datum="` + datum +`"`;

                connection.query(query, (err, result) => {
                    console.log(err);
                });
            });

        });

    });
});
