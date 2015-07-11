var bcrypt = require('bcrypt-nodejs');
var User = require('../../models/user');
var Resume = require('../../models/resume');

module.exports = function updateTheme(req, res, next) {

    var db = req.db;
    var redis = req.redis;

    var password = req.body.password;
    var email = req.body.email;
    var theme = req.body.theme;

    User.findOne({
        'email': email
    }, function(err, user) {
      if (err){
        return next(err);
      }

      // Why isn't mongoose returning a user object
      if (user) user = user.toObject();

        redis.get(req.body.session, function(err, valueExists) {

            if (!valueExists && user && bcrypt.compareSync(password, user.hash)) {

                Resume.update({
                    //query
                    'jsonresume.username': user.username
                }, {
                    // update set new theme
                    'jsonresume.theme': theme
                }, function(err, resume) {
                    res.send({
                        url: 'http://registry.jsonresume.org/' + user.username
                    });
                });
            } else if (valueExists === null) {
                res.send({
                    sessionError: 'invalid session'
                });
            } else if (valueExists === 'true') {
                Resume.update({
                    //query
                    'jsonresume.username': user.username
                }, {
                    // update set new theme
                    'jsonresume.theme': theme
                }, function(err, resume) {
                    res.send({
                        url: 'http://registry.jsonresume.org/' + user.username
                    });
                });


            } else {
                res.send({
                    message: 'authentication error'
                });
            }
        });
    });

}
