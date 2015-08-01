var HttpStatus = require('http-status-codes');
var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');

var remove = function(req, res, next) {
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
};


module.exports = {
    remove: remove
};
