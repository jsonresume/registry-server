module.exports = function stats(req, res, next) {

    var db = req.db
    var redis = req.redis


    redis.get('views', function(err, views) {
        db.collection('users').find().count(function(err, usercount) {
            if (err) {
                return next(err);
            }
            db.collection('resumes').find().count(function(err, resumecount) {
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
