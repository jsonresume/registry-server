var express = require("express");
var Mustache = require('mustache');
var resumeToText = require('resume-to-text');
var path = require('path');
var resumeToHTML = require('resume-to-html');
var resumeToPDF = require('resume-to-pdf');
var resumeToMarkdown = require('resume-to-markdown');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var gravatar = require('gravatar');
var app = express();

var postmark = require("postmark")(process.env.POSTMARK_API_KEY);


var MongoClient = require('mongodb').MongoClient;
var mongo = require('mongodb');
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
        var routeTemplate = fs.readFileSync(path.resolve(__dirname, 'home.template'), 'utf8');
        db.collection('users').find({}).toArray(function(err, docs) {
            var usernameArray = [];
            docs.forEach(function(doc) {
                usernameArray.push({
                    username: doc.username,
                    gravatar: gravatar.url(doc.email, {s: '80', r: 'pg', d: '404'})
                });
            });
            var page = Mustache.render(routeTemplate, {
                usernames: usernameArray
            });
            res.send(page);
        });

    };

    var renderResume = function(req, res) {
        var uid = req.params.uid;
        var format = req.params.format || 'html';
        console.log(format);
        db.collection('resumes').findOne({
            'jsonresume.username': uid,
        }, function(err, resume) {

            var content = '';
            switch (format) {
                case 'json':
                    content = JSON.stringify(resume, undefined, 4);
                    res.set({
                        'Content-Type': 'text/plain',
                        'Content-Length': content.length
                    });

                    res.send(content);
                    break;
                case 'txt':
                    content = resumeToText(resume, function(plainText) {
                        res.set({
                            'Content-Type': 'text/plain',
                            'Content-Length': plainText.length
                        });
                        res.send(200, plainText);
                    });
                    break
                case 'md':
                    resumeToMarkdown(resume, function(markdown, errs) {
                        res.set({
                            'Content-Type': 'text/plain',
                            'Content-Length': markdown.length
                        });
                        res.send(markdown);
                    })
                    break;
                case 'pdf':
                    resumeToPDF(resume, function(err, buffer) {
                        if (err) return console.log(err);
                        res.contentType("application/pdf");
                        res.send(buffer);
                    });
                    break;
                default:
                    console.log('def')
                    resumeToHTML(resume, function(content, errs) {
                        var resumeTemplate = fs.readFileSync(path.resolve(__dirname, 'layout.template'), 'utf8');

                        var page = Mustache.render(resumeTemplate, {
                            output: content,
                            resume: resume,
                            username: uid
                        });
                        res.send(page);
                    });
            }
        });
    };

    app.get('/', renderHomePage);
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
                        username: user.username
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
                username: guestUsername
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
                        var hash = bcrypt.hashSync(req.body.password);
                        postmark.send({
                            "From": "admin@jsonresume.org",
                            "To": req.body.email,
                            "Subject": "Welcome to JsonResume.org",
                            "TextBody": "You suck"
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

    var port = Number(process.env.PORT || 5000);
    app.listen(port, function() {
        console.log("Listening on " + port);
    });
})
