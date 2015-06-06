var fs = require('fs');
var bcrypt = require('bcrypt-nodejs');
var Mustache = require('mustache');
var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
var HttpStatus = require('http-status-codes');

module.exports = function userController(req, res) {

    var db = req.db

    // console.log(req.body);
    db.collection('users').findOne({
        'email': req.body.email
    }, function(err, user) {
        if (user) {
            res.status(HttpStatus.CONFLICT).send({
                error: {
                    field: 'email',
                    message: 'Email is already in use, maybe you forgot your password?'
                }
            });
        } else {

            db.collection('users').findOne({
                'username': req.body.username
            }, function(err, user) {
                if (user) {
                    res.status(HttpStatus.CONFLICT).send({
                        error: {
                            field: 'username',
                            message: 'This username is already taken, please try another one'
                        }
                    });
                } else {
                    var emailTemplate = fs.readFileSync('templates/email/welcome.html', 'utf8');
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


                    db.collection('users').insert({
                        username: req.body.username,
                        email: req.body.email,
                        hash: hash
                    }, {
                        safe: true
                    }, function(err, user) {
                        req.session.username = user[0].username;
                        req.session.email = user[0].email;
                        // console.log('USER CREATED', req.session, req.session.username);
                        res.status(HttpStatus.CREATED).send({
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
};
