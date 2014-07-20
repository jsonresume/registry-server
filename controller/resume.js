exports.postResume = function(req, res) {
    var password = req.body.password;
    var email = req.body.email;
    // console.log(req.body);
    if (!req.body.guest) {
        req.db.collection('users').findOne({
            'email': email
        }, function(err, user) {
            // console.log(err, user);


            redis.get(req.body.session, function(err, valueExists) {

                if (user && password && bcrypt.compareSync(password, user.hash)) {
                    var resume = req.body && req.body.resume || {};
                    resume.jsonresume = {
                        username: user.username,
                        passphrase: req.body.passphrase || null,
                        theme: req.body.theme || null
                    };
                    console.log('inserted');
                    req.db.collection('resumes').update({
                        'jsonresume.username': user.username
                    }, resume, {
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
                } else if (valueExists) {

                    console.log('success');
                    var resume = req.body && req.body.resume || {};
                    resume.jsonresume = {
                        username: user.username,
                        passphrase: req.body.passphrase || null,
                        theme: req.body.theme || null
                    };
                    console.log('inserted');
                    req.db.collection('resumes').update({
                        'jsonresume.username': user.username
                    }, resume, {
                        upsert: true,
                        safe: true
                    }, function(err, resume) {
                        res.send({
                            url: 'http://registry.jsonresume.org/' + user.username
                        });
                    });

                } else {
                    res.send({
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
        req.db.collection('resumes').insert(resume, {
            safe: true
        }, function(err, resume) {
            res.send({
                url: 'http://registry.jsonresume.org/' + guestUsername
            });
        });
    }
}

exports.changeTheme = function(req, res) {

    console.log(req.body);

    var password = req.body.password;
    var email = req.body.email;
    var theme = req.body.theme;
    console.log(theme, "theme update!!!!!!!!!!!!1111");
    // console.log(req.body);
    req.db.collection('users').findOne({
        'email': email
    }, function(err, user) {

        redis.get(req.body.session, function(err, valueExists) {
            console.log(err, valueExists, 'theme redis');

            if (!valueExists && user && bcrypt.compareSync(password, user.hash)) {

                req.db.collection('resumes').update({
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
                req.db.collection('resumes').update({
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