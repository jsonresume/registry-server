var bcrypt = require('bcrypt-nodejs');

var changePassword = function(req, res) {

  console.log('hehehehehe', req.body);
    var email = req.body.email;
    var password = req.body.currentPassword;
    var hash = bcrypt.hashSync(req.body.newPassword);

    var db = req.db
    var redis = req.redis

    db.collection('users').findOne({
        'email': email
    }, function(err, user) {

      console.log(err, user);
        if (user && bcrypt.compareSync(password, user.hash)) {
            // console.log(req.body);
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
                console.log(err, user);
                if (!err) {
                    res.send({
                        message: "password updated"
                    });
                }
            });
        }
    });
};

module.exports = {
  changePassword: changePassword
}
