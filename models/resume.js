var db = require('../db');

exports.findOne = function findOne(conditions, callback) {

    var collection = db.get().collection('resumes');

    // todo validate conditions

    collection.findOne(conditions, function(err, resume) {
        callback(err, resume);
    });
};


exports.update = function update(conditions, update, callback) {

    var collection = db.get().collection('resumes');

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

    var collection = db.get().collection('resumes');

    collection.remove(conditions, 1, function(err, numberRemoved) {
        callback(err, numberRemoved);
    });
};

exports.create = function create(conditions, callback) {

    var collection = db.get().collection('resumes');

    collection.insert(conditions, {
        safe: true
    }, callback);

};

exports.count = function count(conditions, callback) {

    var collection = db.get().collection('resumes');

    collection.find(conditions).count(callback);

};
