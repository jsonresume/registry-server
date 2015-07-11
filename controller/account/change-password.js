var bcrypt = require('bcrypt-nodejs');
var User = require('../../models/user');

module.exports = function changePassword(req, res, next) {

    var email = req.body.email;
    var password = req.body.currentPassword;
    var hash = bcrypt.hashSync(req.body.newPassword);

    User.findOne({
        'email': email
    }, function(err, user) {
        if (err) {
            return next(err);
        }
        // Why isn't mongoose returning a user object
        if (user) user = user.toObject();

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

        var conditions = {
            'email': email
        };

        var update = {
            'hash': hash
        };

        User.update(conditions, update, function(err, user) {
            if (err) {
                return next(err);
            }

            res.send({
                message: 'password updated'
            });

        });
    });
};
