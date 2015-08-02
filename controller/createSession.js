var HttpStatus = require('http-status-codes');
var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');

module.exports = function createSession(req, res, next) {

    var redis = req.redis

    function uid(len) {
        return Math.random().toString(35).substr(2, len);
    }

    var password = req.body.password;
    var email = req.body.email;
    // console.log(req.body);
    User.findOne({
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
};
