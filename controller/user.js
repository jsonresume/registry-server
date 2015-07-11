var fs = require('fs');
var bcrypt = require('bcrypt-nodejs');
var Mustache = require('mustache');
var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
var User = require('../models/user');

module.exports = function userController(req, res, next) {
console.log('hit the user controller');
    // console.log(req.body);
    User.findOne({
        'email': req.body.email
    }, function(err, user) {
      // Why isn't mongoose returning a user object
      if (user) user = user.toObject();

        if (user) {
            res.status(409).json({  // HTTP Status 409 Conflict
                error: {
                    field: 'email',
                    message: 'Email is already in use, maybe you forgot your password?'
                }
            });
        } else {

            User.findOne({
                'username': req.body.username
            }, function(err, user) {
              // Why isn't mongoose returning a user object
              if (user) user = user.toObject();
                if (user) {
                    res.status(409).json({ // HTTP Status 409 Conflict
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
                    // postmark.send({
                    //     "From": "admin@jsonresume.org",
                    //     "To": req.body.email,
                    //     "Subject": "Json Resume - Community driven HR",
                    //     "TextBody": emailCopy
                    // }, function(error, success) {
                    //     if (error) {
                    //         console.error("Unable to send via postmark: " + error.message);
                    //         return;
                    //     }
                    //     console.info("Sent to postmark for delivery")
                    // });


                    var newUser = {
                        username: req.body.username,
                        email: req.body.email,
                        hash: hash
                    };

                    User.create(newUser, function(err, user) {
                      
                        if (err) {
                            return next(err);
                        }

                        req.session.username = user.username;
                        req.session.email = user.email;
                        // console.log('USER CREATED', req.session, req.session.username);
                        res.status(201).json({ // HTTP status 201 created
                            // username: user.username,
                            email: user.email,
                            username: user.username,
                            message: "success"
                        });
                    });
                }
            });
        }

    });
};
