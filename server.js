require('dotenv').load();
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
var compress = require('compression');
var minify = require('express-minify');
var pusher = null;
var controller = require('./controller');
if (process.env.PUSHER_KEY) {
    pusher = new Pusher({
        appId: '83846',
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET
    });
};
var points = [];
var realTimeViews = 0;

var DEFAULT_THEME = 'modern';

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
};

app.use(compress());
app.use(minify({
    cache: __dirname + '/cache'
}));
app.use(allowCrossDomain);
app.use(cookieParser());
app.use(expressSession({
    store: new RedisStore({
        client: redis
    }),
    secret: 'keyboard cat'
}));
//app.use(expressSession({secret:'somesecrettokenhere'}));

app.use(express.static(__dirname + '/editor', {
    maxAge: 21600 * 1000
}));

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

var defaultMongoUrl = "mongodb://localhost:27017/jsonresume";
if (!process.env.MONGOHQ_URL) {
    console.log("Using default MONGOHQ_URL=" + defaultMongoUrl);
}
var mongoUrl = process.env.MONGOHQ_URL || defaultMongoUrl;

var db;

MongoClient.connect(process.env.MONGOHQ_URL, function(err, database) {
    if (err) throw err;

    db = database;

    // start the application only after the database connection is ready
    var port = Number(process.env.PORT || 5000);
    app.listen(port, function() {
        console.log("Listening on " + port);
    });
});

app.all('/*', function(req, res, next) {
    //res.header("Access-Control-Allow-Origin", "*");
    //res.header("Access-Control-Allow-Headers", "X-Requested-With");

    // Make the db accessible to the router
    // probably not the most performant way to pass the db's around
    // TODO find a better way
    req.db = db;
    req.redis = redis;
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
        if (err) {
            redis.set('views', 0);
        } else {
            redis.set('views', views * 1 + 1, redis.print);

        }
        // console.log(views);

        if (pusher !== null) {
            pusher.trigger('test_channel', 'my_event', {
                views: views
            });
        };
    });

    var themeName = req.query.theme || DEFAULT_THEME;
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
            if (typeof req.session.username === 'undefined') {
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
                .end(function(err, response) {
                    client.convertHtml(response.text, pdf.sendHttpResponse(res, null, uid + ".pdf"), {
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
                .end(function(err, response) {
                    if (err) res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err);
                    else res.send(response.text);
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

app.get('/session', controller.session.check);
app.delete('/session/:id', controller.session.remove);

//app.get('/', renderHomePage);

var renderMembersPage = function(req, res) {
    console.log('================================');
    db.collection('users').find({}).toArray(function(err, docs) {
        console.log(err);
        var usernameArray = [];
        docs.forEach(function(doc) {
            usernameArray.push({
                username: doc.username

            });
        });
        var page = Mustache.render(templateHelper.get('members'), {
            usernames: usernameArray
        });
        res.send(page);
    });

};
app.get('/members', renderMembersPage);
app.get('/competition', function(req, res) {
    //{vote: {$ne: null}}, {username:1, vote: 1}
    var leaderboard = {};
    var currentMonth = new Date().getMonth();
    db.collection('tweets').find({
        vote: {
            $ne: null
        }
    }, {
        username: 1,
        vote: 1
    }).toArray(function(e, tweets) {
        tweets = _.filter(tweets, function(tweet) {
            if (currentMonth === new Date(tweet.created_at).getMonth()) {
                return true;
            } else {
                return false;
            }
        });
        console.log(tweets);
        var votes = [];
        _.each(tweets, function(tweet) {
            votes.push({
                username: tweet.username,
                vote: tweet.vote.substr(1)
            })
            if (typeof leaderboard[tweet.vote.substr(1)] === 'undefined') {
                leaderboard[tweet.vote.substr(1)] = 1;
            } else {
                leaderboard[tweet.vote.substr(1)] += 1
            }
        });
        res.send({
            leaderboard: leaderboard,
            votes: votes
        });
    });
});

app.get('/stats', controller.stats);
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
        .end(function(err, response) {
            client.convertHtml(response.text, pdf.sendHttpResponse(res), {
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

app.post('/resume', controller.resume.upsert);
app.put('/resume', controller.resume['update-theme']);
app.post('/user', controller.user);
app.post('/session', controller.session.login);
app.put('/account', controller.account.changePassword);
app.delete('/account', controller.account.remove);
app.post('/:uid', renderResume);

process.addListener('uncaughtException', function(err) {
    console.error('Uncaught error in server.js', {
        err: err,
        stack: err.stack
    });
    // TODO some sort of notification
    // process.exit(1);
});

module.exports = app;
module.exports.DEFAULT_THEME = DEFAULT_THEME;
