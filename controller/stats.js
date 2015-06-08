var User = require('../models/user');
var Resume = require('../models/resume');

module.exports = function stats(req, res, next) {

    var redis = req.redis

    redis.get('views', function(err, views) {
        User.count({}, function(err, usercount) {
            if (err) {
                return next(err);
            }

            Resume.count({}, function(err, resumecount) {
                if (err) {
                    return next(err);
                }

                res.send({
                    userCount: usercount,
                    resumeCount: resumecount,
                    views: views * 1
                });
            });
        });
    });
};
