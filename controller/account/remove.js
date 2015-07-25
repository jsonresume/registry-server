var bcrypt = require('bcrypt-nodejs');
var User = require('../../models/user');
var Resume = require('../../models/resume');

module.exports = function remove(req, res, next) {

    var password = req.body.password;
    var email = req.body.email;

    User.findOne({
        'email': email
    }, function(err, user) {
        if (err) {
            return next(err);
        }

        // Why isn't mongoose returning the user as an object?
        if (user) user = user.toObject();

        if (!user) {
            res.send({
                message: '\nemail not found'
            });
        } else if (user && bcrypt.compareSync(password, user.hash)) {
            // console.log(req.body);

            //remove the users resume
            Resume.remove({
                'jsonresume.username': user.username
            }, function(err, numberRemoved) {
                if(err) {
                  return next(err);
                }
                // then remove user
                User.remove({
                    'email': email
                }, function(err, numberRemoved) {
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
                message: '\ninvalid Password'
            });
        }
    });
};
