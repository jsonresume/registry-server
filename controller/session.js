var HttpStatus = require('http-status-codes');
var bcrypt = require('bcrypt-nodejs');

var login = function(req, res) {

    var db = req.db
    var redis = req.redis

    function uid(len) {
        return Math.random().toString(35).substr(2, len);
    }

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
            console.log('ney');
            res.status(HttpStatus.UNAUTHORIZED).send({
                message: 'authentication error'
            });
        }
    });
};


module.exports = {
    login: login
};
