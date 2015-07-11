var bcrypt = require('bcrypt-nodejs');
var HttpStatus = require('http-status-codes');
var User = require('../../models/user');
var Resume = require('../../models/resume');

function S4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
};

module.exports = function upsert(req, res, next) {
  var redis = req.redis;

  var password = req.body.password;
  var email = req.body.email || req.session.email;

  // console.log(req.body);

  if (!req.body.guest) {
    User.findOne({
      'email': email
    }, function(err, user) {
      if (err) {
        return next(err);
      }
      // Why isn't mongoose returning a user object
    if (user) user = user.toObject();

      redis.get(req.body.session, function(err, valueExists) {
        if (err) {
          return next(err);
        }
        var respondWithResume = function() {

        };

        if ((user && password && bcrypt.compareSync(password, user.hash)) || (typeof req.session.username !== 'undefined') || valueExists) {
          console.log('bcrypt pass');
          var resume = req.body && req.body.resume || {};
          resume.jsonresume = {
            username: user.username,
            passphrase: req.body.passphrase || null,
            theme: req.body.theme || null
          };

          var conditions = {
            'jsonresume.username': user.username
          };

          Resume.update(conditions, resume, {upsert: true}, function(err, resume) {
            if (err) {
              return next(err);
            }

            res.json({
              url: 'http://registry.jsonresume.org/' + user.username
            });
          });

        } else if (!valueExists) {
          res.status(HttpStatus.UNAUTHORIZED).send({
            sessionError: 'invalid session'
          });
        } else {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            message: 'ERRORRRSSSS'
          });
        }
      });
    });
  } else {

    var guestUsername = S4() + S4();
    var resume = req.body && req.body.resume || {};
    resume.jsonresume = {
      username: guestUsername,
      passphrase: req.body.passphrase || null,
      theme: req.body.theme || null
    };

    Resume.create(resume, function(err, resume) {
      if (err) {
        return next(err);
      }

      res.json({
        url: 'http://registry.jsonresume.org/' + guestUsername
      });
    });
  }
};
