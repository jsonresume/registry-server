var db = require('../db');

exports.findOne = function findOne(conditions, callback) {

    var collection = db.get().collection('users');

    // todo validate conditions

    collection.findOne(conditions, function(err, user) {
        callback(err, user);
    });
};

exports.find = function find(conditions, callback) {

    var collection = db.get().collection('users');

    // todo validate conditions

    collection.find(conditions).toArray(function(err, user) {
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

exports.update = function update(conditions, update, callback) {

    var collection = db.get().collection('users');

    collection.update(conditions, {
        $set: update
    }, {
        //options
        upsert: true,
        safe: true
    }, function(err, user) {

        callback(err, user);
    });
};

exports.remove = function remove(conditions, callback) {

    var collection = db.get().collection('users');

    collection.remove(conditions, 1, function(err, numberRemoved) {
        callback(err, numberRemoved);
    });
};

exports.count = function count(conditions, callback) {

    var collection = db.get().collection('users');

    collection.find(conditions).count(callback);

};
