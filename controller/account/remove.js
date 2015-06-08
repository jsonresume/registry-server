var bcrypt = require('bcrypt-nodejs');
var User = require('../../models/user');

module.exports = function remove(req, res, next) {

    var password = req.body.password;
    var email = req.body.email;

    var db = req.db

    db.collection('users').findOne({
        'email': email
    }, function(err, user) {
        if (err) {
            return next(err);
        }

        if (!user) {
            res.send({
                message: '\nemail not found'
            });
        } else if (user && bcrypt.compareSync(password, user.hash)) {
            // console.log(req.body);

            //remove the users resume
            db.collection('resumes').remove({
                'jsonresume.username': user.username
            }, 1, function(err, numberRemoved) {
                console.log(err, numberRemoved, 'resume deleted');
                // then remove user
                db.collection('users').remove({
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
                message: '\ninvalid Password'
            });
        }
    });
};
