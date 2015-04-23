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
var _ = require('lodash');
var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
var MongoClient = require('mongodb').MongoClient;
var mongo = require('mongodb');
var templateHelper = require('./template-helper');
var pdf = require('pdfcrowd');
var request = require('superagent');
var sha256 = require('sha256');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var HttpStatus = require('http-status-codes');
var Pusher = require('pusher');
var pusher = null;
if(process.env.PUSHER_KEY) {
    pusher = new Pusher({
      appId: '83846',
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET
    });
};
var points = [];
var realTimeViews = 0;


if (process.env.REDISTOGO_URL) {
    var rtg = require("url").parse(process.env.REDISTOGO_URL);
    var redis = require("redis").createClient(rtg.port, rtg.hostname);
    redis.auth(rtg.auth.split(":")[1]);
} else {
    var redis = require("redis").createClient();
}
var RedisStore = require('connect-redis')(expressSession);
redis.on("error", function(err) {
    console.log("error event - " + redis.host + ":" + redis.port + " - " + err);
});

var allowCrossDomain = function(req, res, next) {
  // Added other domains you want the server to give access to
  // WARNING - Be careful with what origins you give access to
  var allowedHost = [
    'http://backbonetutorials.com',
    'http://localhost'
  ];

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin)
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    next();
}

app.use(allowCrossDomain);
app.use(cookieParser());
app.use(expressSession({ store: new RedisStore({client: redis}), secret: 'keyboard cat' }))
//app.use(expressSession({secret:'somesecrettokenhere'}));

app.use(express.static(__dirname + '/resume-editor', {maxAge: 7200 * 1000}));

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

var defaulMongoUrl = "mongodb://localhost:27017/jsonresume";
if (!process.env.MONGOHQ_URL) {
    console.log("Using default MONGOHQ_URL="+defaulMongoUrl);
}
var mongoUrl = process.env.MONGOHQ_URL || defaultMongoUrl;
MongoClient.connect(process.env.MONGOHQ_URL, function(err, db) {
    app.all('/*', function(req, res, next) {
        //res.header("Access-Control-Allow-Origin", "*");
        //res.header("Access-Control-Allow-Headers", "X-Requested-With");
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
        realTimeViews++;

        redis.get('views', function(err, views) {
            if(err) {
                redis.set('views', 0);
            } else {
                redis.set('views', views*1+1, redis.print);

            }
            console.log(views);

            if(pusher !== null) {
            pusher.trigger('test_channel', 'my_event', {
              views: views
            });
            };
        });

        var themeName = req.query.theme || 'modern';
        var uid = req.params.uid;
        var format = req.params.format || req.headers.accept || 'html';
        db.collection('resumes').findOne({
            'jsonresume.username': uid,
        }, function(err, resume) {
            if (!resume) {
                var page = Mustache.render(templateHelper.get('noresume'), {});
                res.status(HttpStatus.NOT_FOUND).send(page);
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
                if(typeof req.session.username === 'undefined') {
                    delete resume.jsonresume; // This removes our registry server config vars from the resume.json
                }
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
                // this code is used for web-based pdf export such as http://registry.jsonresume.org/thomasdavis.pdf - see line ~310 for resume-cli export
                console.log('Come on PDFCROWD');
                  var theme = req.query.theme || resume.jsonresume.theme || themeName;
                request
                    .post('http://themes.jsonresume.org/theme/' + theme)
                    .send({
                        resume: resume
                    })
                    .set('Content-Type', 'application/json')
                    .end(function(response) {
                    client.convertHtml(response.text, pdf.sendHttpResponse(res,null,uid+".pdf"), {
                      use_print_media: "true"
                    });

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

    app.get('/session', function(req, res){
      // This checks the current users auth
      // It runs before Backbones router is started
      // we should return a csrf token for Backbone to use
      if(typeof req.session.username !== 'undefined'){
        res.send({auth: true, id: req.session.id, username: req.session.username, _csrf: req.session._csrf});
      } else {
        res.send({auth: false, _csrf: req.session._csrf});
      }
    });
    app.del('/session/:id', function(req, res, next){
      // Logout by clearing the session
      req.session.regenerate(function(err){
        // Generate a new csrf token so the user can login again
        // This is pretty hacky, connect.csrf isn't built for rest
        // I will probably release a restful csrf module
        //csrf.generate(req, res, function () {
          res.send({auth: false, _csrf: req.session._csrf});
        //});
      });
    });


    //app.get('/', renderHomePage);


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
    app.get('/competition', function (req,res) {
        //{vote: {$ne: null}}, {username:1, vote: 1}
        var leaderboard = {};
        var currentMonth = new Date().getMonth();
        db.collection('tweets').find({vote: {$ne: null}}, {username:1, vote: 1}).toArray(  function (e, tweets) {
            tweets = _.filter(tweets, function(tweet){
                if(currentMonth === new Date(tweet.created_at).getMonth()){
                    return true;
                } else {
                    return false;
                }
            });
            console.log(tweets);
            var votes = [];
            _.each(tweets, function(tweet){
                votes.push({username: tweet.username, vote: tweet.vote.substr(1)})
                if(typeof leaderboard[tweet.vote.substr(1)] === 'undefined') {
                    leaderboard[tweet.vote.substr(1)] = 1;
                } else {
                    leaderboard[tweet.vote.substr(1)] += 1
                }
            });
            res.send({leaderboard: leaderboard, votes: votes});
        });
    });
    app.get('/stats', function (req,res) {

        redis.get('views', function(err, views) {
        db.collection('users').find().count(function (e, usercount) {
        db.collection('resumes').find().count(function (e, resumecount) {
            res.send({userCount: usercount,resumeCount: resumecount, views: views*1});
        });
        });
        });

    });
    // export pdf route
    // this code is used by resume-cli for pdf export, see line ~188 for web-based export
    app.get('/pdf', function(req, res) {
        console.log(req.body.resume, req.body.theme);
        request
            .post('http://themes.jsonresume.org/theme/' + req.body.theme)
            .send({
                resume: req.body.resume
            })
            .set('Content-Type', 'application/json')
            .end(function(response) {
                client.convertHtml(response.text, pdf.sendHttpResponse(res),{
                      use_print_media: "true"
                    });
            });
    });


    app.get('/:uid.:format', renderResume);
    app.get('/:uid', renderResume);



    redis.on("error", function(err) {
        console.log("Error " + err);
        res.send({
            sessionError: err
        });
    });


    app.post('/resume', function(req, res) {
        var password = req.body.password;
        var email = req.body.email || req.session.email;

        if (!req.body.guest) {
            db.collection('users').findOne({
                'email': email
            }, function(err, user) {

                redis.get(req.body.session, function(err, valueExists) {
                    var respondWithResume = function() {

                    };

                    if ((user && password && bcrypt.compareSync(password, user.hash))
                      || (typeof req.session.username !== 'undefined')
                      || valueExists) {
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
                    } else if (valueExists === null) {
                        res.status(HttpStatus.UNAUTHORIZED).send({
                            sessionError: 'invalid session'
                        });
                    } else {
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
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

        console.log(req.body);

        var password = req.body.password;
        var email = req.body.email;
        var theme = req.body.theme;
        console.log(theme, "theme update!!!!!!!!!!!!1111");
        // console.log(req.body);
        db.collection('users').findOne({
            'email': email
        }, function(err, user) {

            redis.get(req.body.session, function(err, valueExists) {
                console.log(err, valueExists, 'theme redis');

                if (!valueExists && user && bcrypt.compareSync(password, user.hash)) {

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
                } else if (valueExists === null) {
                    res.send({
                        sessionError: 'invalid session'
                    });
                } else if (valueExists === 'true') {
                    console.log('redis session success');
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

    });


    app.post('/user', function(req, res) {

        // console.log(req.body);
        db.collection('users').findOne({
            'email': req.body.email
        }, function(err, user) {

            if (user) {
                res.status(HttpStatus.CONFLICT).send({
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
                        res.status(HttpStatus.CONFLICT).send({
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
                            req.session.username = user[0].username;
                            req.session.email = user[0].email;
                            // console.log('USER CREATED', req.session, req.session.username);
                            res.status(HttpStatus.CREATED).send({
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
    });





    function uid(len) {
        return Math.random().toString(35).substr(2, len);
    }
    app.post('/session', function(req, res) {
        var password = req.body.password;
        var email = req.body.email;
        // console.log(req.body);
        db.collection('users').findOne({
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
                res.status(HttpStatus.UNAUTHORIZED).send({
                    message: 'authentication error'
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
            console.log(err, user, 'waafdkls');
            if (!user) {
                res.send({
                    message: '\nemail not found'
                });
            } else if (user && bcrypt.compareSync(password, user.hash)) {
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
    });

    //change password
    app.put('/account', function(req, res) {
        var email = req.body.email;
        var password = req.body.currentPassword;
        var hash = bcrypt.hashSync(req.body.newPassword);
        console.log(email, password, hash);

        db.collection('users').findOne({
            'email': email
        }, function(err, user) {
            if (user && bcrypt.compareSync(password, user.hash)) {
                // console.log(req.body);
                db.collection('users').update({
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
    });

    app.post('/:uid', renderResume);

    var port = Number(process.env.PORT || 5000);
    app.listen(port, function() {
        console.log("Listening on " + port);
    });
});

module.exports = app;
