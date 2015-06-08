var db = require('../db');

exports.findOne = function findOne(conditions, callback) {

    var collection = db.get().collection('users');

    // todo validate conditions

    collection.findOne(conditions, function(err, user) {
        callback(err, user);
    });
};


exports.create = function create(conditions, callback) {

    var collection = db.get().collection('users');

    collection.insert(conditions, {
        safe: true
    }, function(err, user) {

        callback(err, user);
    });
};
