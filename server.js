// require('dotenv').load();
require('./lib/mongoose-connection');
var redis = require('./lib/redis-connection');
var express = require("express");
var path = require('path');
var bodyParser = require('body-parser');
var app = express();
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
app.get('/members', controller.renderMembersPage);
app.get('/stats', controller.showStats);
app.get('/pdf', controller.exportPdf);
app.get('/:uid.:format', controller.renderResume);
app.get('/:uid', controller.renderResume);
app.post('/resume', controller.upsertResume);
app.put('/resume', controller.updateTheme);
app.post('/user', controller.createUser);
app.post('/session', controller.createSession);
app.put('/account', controller.changePassword);
app.delete('/account', controller.deleteUser);
app.post('/:uid', controller.renderResume);

process.addListener('uncaughtException', function(err) {
    console.error('Uncaught error in server.js', {
        err: err
        // hide stack in production
        //, stack: err.stack
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
