var request = require('superagent');
var gravatar = require('gravatar');
var Mustache = require('mustache');
var templateHelper = require('../template-helper');



var renderHomePage = function(req, res) {
    req.db.collection('users').find({}).toArray(function(err, docs) {
        var usernameArray = [];
        docs.forEach(function(doc) {
            usernameArray.push({
                username: doc.username,
                gravatar: gravatar.url(doc.email, {
                    s: '80',
                    r: 'pg',
                    d: '404'
                })
            });
        });
        var page = Mustache.render(templateHelper.get('home'), {
            usernames: usernameArray
        });
        res.send(page);
    });

};

var renderResume = function(req, res) {
    console.log('hello')
    var themeName = req.query.theme || 'modern';
    var uid = req.params.uid;
    var format = req.params.format || req.headers.accept || 'html';
    req.db.collection('resumes').findOne({
        'jsonresume.username': uid,
    }, function(err, resume) {
        if (!resume) {
            var page = Mustache.render(templateHelper.get('noresume'), {});
            res.send(page);
            return;
        }
        if (typeof resume.jsonresume.passphrase === 'string' && typeof req.body.passphrase === 'undefined') {

            var page = Mustache.render(templateHelper.get('password'), {});
            res.send(page);
            return;
        }
        if (typeof req.body.passphrase !== 'undefined' && req.body.passphrase !== resume.jsonresume.passphrase) {
            res.send('Password was wrong, go back and try again');
            return;
        }
        var content = '';
        if (/json/.test(format)) {
            delete resume.jsonresume; // This removes our registry server config vars from the resume.json
            delete resume._id; // This removes the document id of mongo
            content = JSON.stringify(resume, undefined, 4);
            res.set({
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(content, 'utf8') // TODO - This is a hack to try get the right content length
                // http://stackoverflow.com/questions/17922748/what-is-the-correct-method-for-calculating-the-content-length-header-in-node-js
            });

            res.send(content);
        } else if (/txt/.test(format)) {
            content = resumeToText(resume, function(plainText) {
                res.set({
                    'Content-Type': 'text/plain',
                    'Content-Length': plainText.length
                });
                res.send(200, plainText);
            });
        } else if (/md/.test(format)) {
            resumeToMarkdown(resume, function(markdown, errs) {
                res.set({
                    'Content-Type': 'text/plain',
                    'Content-Length': markdown.length
                });
                res.send(markdown);
            })
        } else if (/pdf/.test(format)) {
            console.log('Come on PDFCROWD');
            resumeToHTML(resume, {
                theme: resume.jsonresume.theme || themeName
            }, function(content, errs) {
                client.convertHtml(content, pdf.sendHttpResponse(res));
            });
        } else {
            var theme = req.query.theme || resume.jsonresume.theme || themeName;
            request
                .post('http://themes.jsonresume.org/theme/' + theme)
                .send({
                    resume: resume
                })
                .set('Content-Type', 'application/json')
                .end(function(response) {
                    res.send(response.text);
                });
            /*
                resumeToHTML(resume, {
                    
                }, function(content, errs) {
                    console.log(content, errs);
                    var page = Mustache.render(templateHelper.get('layout'), {
                        output: content,
                        resume: resume,
                        username: uid
                    });
                    res.send(content);
                });
                */
        }
    });
};

var renderMembersPage = function(req, res) {
    console.log('================================');
    req.db.collection('users').find({}).toArray(function(err, docs) {
        console.log(err);
        var usernameArray = [];
        docs.forEach(function(doc) {
            usernameArray.push({
                username: doc.username,
                gravatar: gravatar.url(doc.email, {
                    s: '80',
                    r: 'pg',
                    d: '404'
                })
            });
        });
        var page = Mustache.render(templateHelper.get('members'), {
            usernames: usernameArray
        });
        res.send(page);
    });

};

var postResume = function(req, res) {
    var password = req.body.password;
    var email = req.body.email;
    // console.log(req.body);
    if (!req.body.guest) {
        req.db.collection('users').findOne({
            'email': email
        }, function(err, user) {
            // console.log(err, user);


            redis.get(req.body.session, function(err, valueExists) {

                if (user && password && bcrypt.compareSync(password, user.hash)) {
                    var resume = req.body && req.body.resume || {};
                    resume.jsonresume = {
                        username: user.username,
                        passphrase: req.body.passphrase || null,
                        theme: req.body.theme || null
                    };
                    console.log('inserted');
                    req.db.collection('resumes').update({
                        'jsonresume.username': user.username
                    }, resume, {
                        upsert: true,
                        safe: true
                    }, function(err, resume) {
                        res.send({
                            url: 'http://registry.jsonresume.org/' + user.username
                        });
                    });
                } else if (valueExists === null) {
                    res.send({
                        sessionError: 'invalid session'
                    });
                } else if (valueExists) {

                    console.log('success');
                    var resume = req.body && req.body.resume || {};
                    resume.jsonresume = {
                        username: user.username,
                        passphrase: req.body.passphrase || null,
                        theme: req.body.theme || null
                    };
                    console.log('inserted');
                    req.db.collection('resumes').update({
                        'jsonresume.username': user.username
                    }, resume, {
                        upsert: true,
                        safe: true
                    }, function(err, resume) {
                        res.send({
                            url: 'http://registry.jsonresume.org/' + user.username
                        });
                    });

                } else {
                    res.send({
                        message: 'ERRORRRSSSS'
                    });
                }
            });
        });
    } else {
        var guestUsername = S4() + S4();
        var resume = req.body && req.body.resume || {};
        resume.jsonresume = {
            username: guestUsername,
            passphrase: req.body.passphrase || null,
            theme: req.body.theme || null
        };
        console.log('inserted');
        req.db.collection('resumes').insert(resume, {
            safe: true
        }, function(err, resume) {
            res.send({
                url: 'http://registry.jsonresume.org/' + guestUsername
            });
        });
    }
}

var changeTheme = function(req, res) {

    console.log(req.body);

    var password = req.body.password;
    var email = req.body.email;
    var theme = req.body.theme;
    console.log(theme, "theme update!!!!!!!!!!!!1111");
    // console.log(req.body);
    req.db.collection('users').findOne({
        'email': email
    }, function(err, user) {

        redis.get(req.body.session, function(err, valueExists) {
            console.log(err, valueExists, 'theme redis');

            if (!valueExists && user && bcrypt.compareSync(password, user.hash)) {

                req.db.collection('resumes').update({
                    //query
                    'jsonresume.username': user.username
                }, {
                    // update set new theme
                    $set: {
                        'jsonresume.theme': theme
                    }
                }, {
                    //options
                    upsert: true,
                    safe: true
                }, function(err, resume) {
                    res.send({
                        url: 'http://registry.jsonresume.org/' + user.username
                    });
                });
            } else if (valueExists === null) {
                res.send({
                    sessionError: 'invalid session'
                });
            } else if (valueExists === 'true') {
                console.log('redis session success');
                req.db.collection('resumes').update({
                    //query
                    'jsonresume.username': user.username
                }, {
                    // update set new theme
                    $set: {
                        'jsonresume.theme': theme
                    }
                }, {
                    //options
                    upsert: true,
                    safe: true
                }, function(err, resume) {
                    res.send({
                        url: 'http://registry.jsonresume.org/' + user.username
                    });
                });


            } else {
                console.log('deleted');
                res.send({
                    message: 'authentication error'
                });
            }
        });
    });

}

var registerUser = function(req, res) {

    // console.log(req.body);
    req.db.collection('users').findOne({
        'email': req.body.email
    }, function(err, user) {

        if (user) {
            res.send({
                error: {
                    field: 'email',
                    message: 'Email is already in use'
                }
            });
        } else {

            req.db.collection('users').findOne({
                'username': req.body.username
            }, function(err, user) {
                if (user) {
                    res.send({
                        error: {
                            field: 'username',
                            message: 'This username is already taken, please try another one'
                        }
                    });
                } else {
                    var emailTemplate = fs.readFileSync('templates/email/welcome.html', 'utf8');
                    var emailCopy = Mustache.render(emailTemplate, {
                        username: req.body.username
                    });
                    var hash = bcrypt.hashSync(req.body.password);
                    postmark.send({
                        "From": "admin@jsonresume.org",
                        "To": req.body.email,
                        "Subject": "Json Resume - Community driven HR",
                        "TextBody": emailCopy
                    }, function(error, success) {
                        if (error) {
                            console.error("Unable to send via postmark: " + error.message);
                            return;
                        }
                        console.info("Sent to postmark for delivery")
                    });



                    req.db.collection('users').insert({
                        username: req.body.username,
                        email: req.body.email,
                        hash: hash
                    }, {
                        safe: true
                    }, function(err, user) {
                        res.send({
                            // username: user.username,
                            email: user[0].email,
                            username: user[0].username,
                            message: "success"
                        });
                    });
                }
            });
        }

    });
}

var deleteUser = function(req, res) {

    var password = req.body.password;
    var email = req.body.email;

    req.db.collection('users').findOne({
        'email': email
    }, function(err, user) {
        console.log(err, user, 'waafdkls');
        if (!user) {
            res.send({
                message: '\nemail not found'
            });
        } else if (user && bcrypt.compareSync(password, user.hash)) {
            // console.log(req.body);

            //remove the users resume
            req.db.collection('resumes').remove({
                'jsonresume.username': user.username
            }, 1, function(err, numberRemoved) {
                console.log(err, numberRemoved, 'resume deleted');
                // then remove user
                req.db.collection('users').remove({
                    'email': email
                }, 1, function(err, numberRemoved) {
                    console.log(err, numberRemoved, 'user deleted');
                    if (err) {
                        res.send(err);
                    } else {
                        res.send({
                            message: '\nYour account has been successfully deleted.'
                        });

                    }
                });
            });
        } else {
            res.send({
                message: "\ninvalid Password"
            });
        }
    });
}

var changePassword = function(req, res) {
    var email = req.body.email;
    var password = req.body.currentPassword;
    var hash = bcrypt.hashSync(req.body.newPassword);
    console.log(email, password, hash);

    req.db.collection('users').findOne({
        'email': email
    }, function(err, user) {
        if (user && bcrypt.compareSync(password, user.hash)) {
            // console.log(req.body);
            req.db.collection('users').update({
                //query
                'email': email
            }, {
                $set: {
                    'hash': hash
                }
            }, {
                //options
                upsert: true,
                safe: true
            }, function(err, user) {
                console.log(err, user);
                if (!err) {
                    res.send({
                        message: "password updated"
                    });
                }
            });
        }
    });
}


function uid(len) {
    return Math.random().toString(35).substr(2, len);
}

var createSession = function(req, res) {
    var password = req.body.password;
    var email = req.body.email;
    // console.log(req.body);
    req.db.collection('users').findOne({
        'email': email
    }, function(err, user) {
        if (user && bcrypt.compareSync(password, user.hash)) {
            // console.log(email, bcrypt.hashSync(email));
            // console.log(email, bcrypt.hashSync(email));
            var sessionUID = uid(32);

            redis.set(sessionUID, true, redis.print);



            // var session = value.toString();

            req.session.username = user.username;
            req.session.email = email;
            res.send({
                message: 'loggedIn',
                username: user.username,
                email: email,
                session: sessionUID,
                auth: true
            });



            // redis.quit();
        } else {
            res.send({
                message: 'authentication error'
            });
        }
    });
}

var exportPdf = function(req, res) {
    console.log(req.body.resume, req.body.theme);
    request
        .post('http://themes.jsonresume.org/theme/' + req.body.theme)
        .send({
            resume: req.body.resume
        })
        .set('Content-Type', 'application/json')
        .end(function(response) {
            client.convertHtml(response.text, pdf.sendHttpResponse(res));
        });
}

var deleteSession = function(req, res, next) {
    // Logout by clearing the session
    req.session.regenerate(function(err) {
        // Generate a new csrf token so the user can login again
        // This is pretty hacky, connect.csrf isn't built for rest
        // I will probably release a restful csrf module
        //csrf.generate(req, res, function () {
        res.send({
            auth: false,
            _csrf: req.session._csrf
        });
        //});
    });
}

var checkAuth = function(req, res) {
    // This checks the current users auth
    // It runs before Backbones router is started
    // we should return a csrf token for Backbone to use
    if (typeof req.session.username !== 'undefined') {
        res.send({
            auth: true,
            id: req.session.id,
            username: req.session.username,
            _csrf: req.session._csrf
        });
    } else {
        res.send({
            auth: false,
            _csrf: req.session._csrf
        });
    }
}

module.exports = {
    renderHomePage: renderHomePage,
    renderResume: renderResume,
    renderMembersPage: renderMembersPage,
    postResume: postResume,
    changeTheme: changeTheme,
    registerUser: registerUser,
    deleteUser: deleteUser,
    changePassword: changePassword,
    createSession: createSession,
    exportPdf: exportPdf,
    deleteSession: deleteSession,
    checkAuth: checkAuth

}