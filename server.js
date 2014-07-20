var controller = require('./controller');

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
var request = require('superagent');
var sha256 = require('sha256');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
if (process.env.REDISTOGO_URL) {
    var rtg = require("url").parse(process.env.REDISTOGO_URL);
    var redis = require("redis").createClient(rtg.port, rtg.hostname);
    redis.auth(rtg.auth.split(":")[1]);
} else {
    var redis = require("redis").createClient();
}

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

app.use(expressSession({
    secret: 'somesecrettokenhere'
}));

app.use(express.static(__dirname + '/assets', {
    maxAge: 7200 * 1000
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


MongoClient.connect(process.env.MONGOHQ_URL, function(err, db) {

    //add req with db
    app.use(function(req, res, next) {
        // req.db = {};
        req.db = db;
        next();
    });

    app.all('/*', function(req, res, next) {
        //res.header("Access-Control-Allow-Origin", "*");
        //res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });

    app.get('/', controller.renderHomePage);

    app.post('/session', controller.session.createSession);
    app.get('/session', controller.session.checkAuth);
    app.del('/session/:id', controller.session.deleteSession);



    app.get('/members', controller.renderMembersPage);

    app.get('/pdf', controller.exportPdf);

    app.get('/:uid.:format', controller.renderResume);
    app.get('/:uid', controller.renderResume);
    app.post('/:uid', controller.renderResume);

    app.post('/resume', controller.resume.postResume);
    app.put('/resume', controller.resume.changeTheme);



    var userTest = require('./controller/user'); //fix this, not working form controller index for some reason

    app.post('/user', userTest.registerUser);
    app.delete('/account', userTest.deleteUser);
    app.put('/account', userTest.changePassword);


    var port = Number(process.env.PORT || 5000);
    app.listen(port, function() {
        console.log("Listening on " + port);
    });
})