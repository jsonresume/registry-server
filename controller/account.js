var bcrypt = require('bcrypt-nodejs');

var changePassword = function(req, res, next) {

    var email = req.body.email;
    var password = req.body.currentPassword;
    var hash = bcrypt.hashSync(req.body.newPassword);

    var db = req.db

    db.collection('users').findOne({
        'email': email
    }, function(err, user) {
        if (err) {
            return next(err);
        }

        if (!user) {
            return res.status(401).json({ //HTTP Error 401 Unauthorized
                message: 'email not found'
            });

        }

        if (!bcrypt.compareSync(password, user.hash)) {
            return res.status(401).json({ //HTTP Error 401 Unauthorized
                message: 'invalid password'
            });
        }

        db.collection('users').update({
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
            if (err) {
              return next(err);
            }

            res.send({
                message: 'password updated'
            });

        });
    });
};

var remove = function(req, res) {

    var password = req.body.password;
    var email = req.body.email;

    var db = req.db

    db.collection('users').findOne({
        'email': email
    }, function(err, user) {
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

module.exports = {
    changePassword: changePassword,
    remove: remove
}
