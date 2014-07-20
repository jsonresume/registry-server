var Mustache = require('mustache');
var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
var bcrypt = require('bcrypt-nodejs');


exports.registerUser = function(req, res) {

    // console.log(req.body);
    req.db.collection('users').findOne({
        'email': req.body.email
    }, function(err, user) {

        if (user) {
            res.send({
                error: {
                    field: 'email',
                    message: 'Email is already in use'
                }
            });
        } else {

            req.db.collection('users').findOne({
                'username': req.body.username
            }, function(err, user) {
                if (user) {
                    res.send({
                        error: {
                            field: 'username',
                            message: 'This username is already taken, please try another one'
                        }
                    });
                } else {
                    var emailTemplate = fs.readFileSync('../templates/email/welcome.html', 'utf8');
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



                    req.db.collection('users').insert({
                        username: req.body.username,
                        email: req.body.email,
                        hash: hash
                    }, {
                        safe: true
                    }, function(err, user) {
                        res.send({
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
}

exports.deleteUser = function(req, res) {

    var password = req.body.password;
    var email = req.body.email;

    req.db.collection('users').findOne({
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
            req.db.collection('resumes').remove({
                'jsonresume.username': user.username
            }, 1, function(err, numberRemoved) {
                console.log(err, numberRemoved, 'resume deleted');
                // then remove user
                req.db.collection('users').remove({
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
}

exports.changePassword = function(req, res) {
    var email = req.body.email;
    var password = req.body.currentPassword;
    var hash = bcrypt.hashSync(req.body.newPassword);
    console.log(email, password, hash);

    req.db.collection('users').findOne({
        'email': email
    }, function(err, user) {
        if (user && bcrypt.compareSync(password, user.hash)) {
            // console.log(req.body);
            req.db.collection('users').update({
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
}