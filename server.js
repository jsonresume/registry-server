// require('dotenv').load();
require('./lib/mongoose-connection');
var redis = require('./lib/redis-connection');
var express = require("express");
var path = require('path');
var bodyParser = require('body-parser');
var pdf = require('pdfcrowd');
var client = new pdf.Pdfcrowd('thomasdavis', '7d2352eade77858f102032829a2ac64e');
var app = express();
var request = require('superagent');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var minify = require('express-minify');
var controller = require('./controller');

var points = [];
var DEFAULT_THEME = 'modern';

var RedisStore = require('connect-redis')(expressSession);

app.use(compress());
app.use(minify({
    cache: __dirname + '/cache'
}));
app.use(require('./middleware/allow-cross-domain'));
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

app.all('/*', function(req, res, next) {
    //res.header("Access-Control-Allow-Origin", "*");
    //res.header("Access-Control-Allow-Headers", "X-Requested-With");

    // Make the db accessible to the router
    // probably not the most performant way to pass the db's around
    // TODO find a better way
    req.redis = redis;
    next();
});

app.get('/session', controller.checkSession);
app.delete('/session/:id', controller.deleteSession);
app.get('/members', controller.render['members-page']);
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

app.get('/:uid.:format', controller.renderResume);
app.get('/:uid', controller.renderResume);
app.post('/resume', controller.resume.upsert);
app.put('/resume', controller.resume['update-theme']);
app.post('/user', controller.createUser);
app.post('/session', controller.createSession);
app.put('/account', controller.changePassword);
app.delete('/account', controller.deleteUser);
app.post('/:uid', controller.render.resume);

process.addListener('uncaughtException', function(err) {
    console.error('Uncaught error in server.js', {
        err: err,
        stack: err.stack
    });
    // TODO some sort of notification
    // process.exit(1);
});

var port = Number(process.env.PORT || 5000);

app.listen(port, function() {
    console.log("Listening on " + port);
});

module.exports = app;
module.exports.DEFAULT_THEME = DEFAULT_THEME;
