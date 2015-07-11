var Mustache = require('mustache');
var templateHelper = require('../../template-helper');
var User = require('../../models/user');

module.exports = function renderMembersPage(req, res, next) {

    User.find({}, function(err, docs) {
        if (err) {
            return next(err);
        }

        docs = docs.toObject();

        var usernameArray = [];

        docs.forEach(function(doc) {
            usernameArray.push({
                username: doc.username

            });
        });

        var page = Mustache.render(templateHelper.get('members'), {
            usernames: usernameArray
        });

        res.send(page);
    });
};
