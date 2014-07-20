function uid(len) {
    return Math.random().toString(35).substr(2, len);
}


exports.createSession = function(req, res) {
    var password = req.body.password;
    var email = req.body.email;
    // console.log(req.body);
    req.db.collection('users').findOne({
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
            res.send({
                message: 'authentication error'
            });
        }
    });
}

exports.checkAuth = function(req, res) {
    // This checks the current users auth
    // It runs before Backbones router is started
    // we should return a csrf token for Backbone to use
    if (typeof req.session.username !== 'undefined') {
        res.send({
            auth: true,
            id: req.session.id,
            username: req.session.username,
            _csrf: req.session._csrf
        });
    } else {
        res.send({
            auth: false,
            _csrf: req.session._csrf
        });
    }
}

exports.deleteSession = function(req, res, next) {
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
}