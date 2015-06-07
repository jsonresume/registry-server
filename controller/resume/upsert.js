var bcrypt = require('bcrypt-nodejs');
var HttpStatus = require('http-status-codes');

function S4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
};

module.exports = function upsert(req, res, next) {
    var db = req.db;
    var redis = req.redis;

    var password = req.body.password;
    var email = req.body.email || req.session.email;

    if (!req.body.guest) {
        db.collection('users').findOne({
            'email': email
        }, function(err, user) {
          if (err) {
            return next(err);
          }

            redis.get(req.body.session, function(err, valueExists) {
                var respondWithResume = function() {

                };

                if ((user && password && bcrypt.compareSync(password, user.hash)) || (typeof req.session.username !== 'undefined') || valueExists) {
                    var resume = req.body && req.body.resume || {};
                    resume.jsonresume = {
                        username: user.username,
                        passphrase: req.body.passphrase || null,
                        theme: req.body.theme || null
                    };
                    db.collection('resumes').update({
                        'jsonresume.username': user.username
                    }, resume, {
                        upsert: true,
                        safe: true
                    }, function(err, resume) {
                        if (err) {
                            return next(err);
                        }

                        res.send({
                            url: 'http://registry.jsonresume.org/' + user.username
                        });
                    });
                } else if (valueExists === null) {
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
        console.log('inserted');
        db.collection('resumes').insert(resume, {
            safe: true
        }, function(err, resume) {
            console.log(err, resume);
            if (err) {
                return next(err);
            }

            res.send({
                url: 'http://registry.jsonresume.org/' + guestUsername
            });
        });
    }
};
