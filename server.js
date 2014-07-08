var express = require("express");
var Mustache = require('mustache');
var resumeToText = require('resume-to-text');
var path = require('path');
var resumeToHTML = require('resume-to-html');
var resumeToMarkdown = require('resume-to-markdown');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var gravatar = require('gravatar');
var app = express();
var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
var MongoClient = require('mongodb').MongoClient;
var mongo = require('mongodb');
var templateHelper = require('./template-helper');
var pdf = require('pdfcrowd');

var client = new pdf.Pdfcrowd('thomasdavis', '7d2352eade77858f102032829a2ac64e');
app.use(bodyParser());
var fs = require('fs');
var guid = (function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
})();

function S4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
};

MongoClient.connect(process.env.MONGOHQ_URL, function(err, db) {
    app.all('/*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });

    var renderHomePage = function(req, res) {
        db.collection('users').find({}).toArray(function(err, docs) {
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
        db.collection('resumes').findOne({
            'jsonresume.username': uid,
        }, function(err, resume) {
            if (!resume) {
                console.log(templateHelper.get('noresume'));
                var page = Mustache.render(templateHelper.get('noresume'), {});
                res.send(page);
                return;
            }
            if (typeof resume.jsonresume.passphrase === 'string' && typeof req.body.passphrase === 'undefined') {

                var page = Mustache.render(templateHelper.get('password'), {});
                res.send(page);
                return;
            }
            console.log(req.body.passphrase, resume.jsonresume.passphrase);
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
                console.log('def')
                resumeToHTML(resume, {
                    theme: resume.jsonresume.theme || themeName
                }, function(content, errs) {
                    console.log(content, errs);
                    var page = Mustache.render(templateHelper.get('layout'), {
                        output: content,
                        resume: resume,
                        username: uid
                    });
                    res.send(content);
                });
            }
        });
    };

    app.get('/', renderHomePage);


    var renderMembersPage = function(req, res) {
        console.log('================================');
        db.collection('users').find({}).toArray(function(err, docs) {
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
    app.get('/members', renderMembersPage);


    app.get('/:uid.:format', renderResume);
    app.get('/:uid', renderResume);







    app.post('/resume', function(req, res) {
        var password = req.body.password;
        var email = req.body.email;
        console.log(req.body);
        if (!req.body.guest) {
            db.collection('users').findOne({
                'email': email
            }, function(err, user) {
                if (user && bcrypt.compareSync(password, user.hash)) {
                    var resume = req.body && req.body.resume || {};
                    resume.jsonresume = {
                        username: user.username,
                        passphrase: req.body.passphrase || null,
                        theme: req.body.theme || null
                    };
                    console.log('inserted');
                    db.collection('resumes').update({
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
                    console.log('deleted');
                    res.send({
                        message: 'ERRORRRSSSS'
                    });
                }
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
            db.collection('resumes').insert(resume, {
                safe: true
            }, function(err, resume) {
                res.send({
                    url: 'http://registry.jsonresume.org/' + guestUsername
                });
            });
        }
    });

    // update theme
    app.put('/resume', function(req, res) {
        var password = req.body.password;
        var email = req.body.email;
        var theme = req.body.theme;
        console.log(theme, "theme update!!!!!!!!!!!!1111");
        // console.log(req.body);
        db.collection('users').findOne({
            'email': email
        }, function(err, user) {
            if (user && bcrypt.compareSync(password, user.hash)) {

                db.collection('resumes').update({
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


    app.post('/user', function(req, res) {

        console.log(req.body);
        db.collection('users').findOne({
            'email': req.body.email
        }, function(err, user) {

            if (user) {
                res.send({
                    error: {
                        field: 'email',
                        message: 'Email is already in use, maybe you forgot your password?'
                    }
                });
            } else {

                db.collection('users').findOne({
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
                        db.collection('users').insert({
                            username: req.body.username,
                            email: req.body.email,
                            hash: hash
                        }, {
                            safe: true
                        }, function(err, user) {
                            res.send({
                                message: "success"
                            });
                        });
                    }
                });
            }

        });
    });



    //delete user
    app.delete('/account', function(req, res) {

        var password = req.body.password;
        var email = req.body.email;

        db.collection('users').findOne({
            'email': email
        }, function(err, user) {
            if (user && bcrypt.compareSync(password, user.hash)) {
                // console.log(req.body);

                //remove the users resume
                db.collection('resumes').remove({
                    'jsonresume.username': user.username
                }, 1, function(err, numberRemoved) {
                    console.log(err, numberRemoved, 'resume deleted');
                    // then remove user
                    db.collection('users').remove({
                        'email': email
                    }, 1, function(err, numberRemoved) {
                        console.log(err, numberRemoved, 'user deleted');
                        if (!err) {
                            res.send({
                                message: "account deleted"
                            });
                        }
                    });
                });
            }
        });
    });




    app.post('/:uid', renderResume);

    var port = Number(process.env.PORT || 5000);
    app.listen(port, function() {
        console.log("Listening on " + port);
    });
})