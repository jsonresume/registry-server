module.exports = function stats(req, res) {

    var db = req.db
    var redis = req.redis


    redis.get('views', function(err, views) {
        db.collection('users').find().count(function(e, usercount) {
            db.collection('resumes').find().count(function(e, resumecount) {
                res.send({
                    userCount: usercount,
                    resumeCount: resumecount,
                    views: views * 1
                });
            });
        });
    });

};
