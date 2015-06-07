var bcrypt = require('bcrypt-nodejs');

module.exports = function updateTheme(req, res, next) {

    var db = req.db;
    var redis = req.redis;

    var password = req.body.password;
    var email = req.body.email;
    var theme = req.body.theme;
    console.log(theme, "theme update!!!!!!!!!!!!1111");
    // console.log(req.body);
    db.collection('users').findOne({
        'email': email
    }, function(err, user) {

        redis.get(req.body.session, function(err, valueExists) {
            console.log(err, valueExists, 'theme redis');

            if (!valueExists && user && bcrypt.compareSync(password, user.hash)) {

                db.collection('resumes').update({
                    //query
                    'jsonresume.username': user.username
                }, {
                    // update set new theme
                    $set: {
                        'jsonresume.theme': theme
                    }
                }, {
                    //options
                    upsert: true,
                    safe: true
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
                console.log('redis session success');
                db.collection('resumes').update({
                    //query
                    'jsonresume.username': user.username
                }, {
                    // update set new theme
                    $set: {
                        'jsonresume.theme': theme
                    }
                }, {
                    //options
                    upsert: true,
                    safe: true
                }, function(err, resume) {
                    res.send({
                        url: 'http://registry.jsonresume.org/' + user.username
                    });
                });


            } else {
                console.log('deleted');
                res.send({
                    message: 'authentication error'
                });
            }
        });
    });

}
