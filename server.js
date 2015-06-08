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
var templateHelper = require('./template-helper');
var pdf = require('pdfcrowd');
var request = require('superagent');
var sha256 = require('sha256');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var HttpStatus = require('http-status-codes');
var compress = require('compression');
var minify = require('express-minify');
var controller = require('./controller');

var points = [];


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
var mongo = require('./db');
var db;
// Connect to Mongo on start
mongo.connect(mongoUrl, function(err) {
    if (err) {
        console.log('Error connecting to Mongo.', {
            err: err
        });
        return process.exit(1)
    }
    // start the application only after the database connection is ready
    var port = Number(process.env.PORT || 5000);
    app.listen(port, function() {
        console.log("Listening on " + port);
        db = mongo.get();
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

var User = require('./models/user');
var Resume = require('./models/resume');


// not in use
// var renderHomePage = function(req, res) {
//     User.find({}, function(err, docs) {
//         var usernameArray = [];
//         docs.forEach(function(doc) {
//             usernameArray.push({
//                 username: doc.username,
//                 gravatar: gravatar.url(doc.email, {
//                     s: '80',
//                     r: 'pg',
//                     d: '404'
//                 })
//             });
//         });
//         var page = Mustache.render(templateHelper.get('home'), {
//             usernames: usernameArray
//         });
//         res.send(page);
//     });
//
// };



app.get('/session', controller.session.check);
app.delete('/session/:id', controller.session.remove);

//app.get('/', renderHomePage);

var renderMembersPage = function(req, res, next) {
    console.log('================================');
    User.find({}, function(err, docs) {
        if (err) {
          return next(err);
        }
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

app.get('/:uid.:format', controller.render.resume);
app.get('/:uid', controller.render.resume);

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
app.post('/:uid', controller.render.resume);

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
