var db = require('../db');

exports.findOne = function findOne(conditions, callback) {

    var collection = db.get().collection('resumes');

    // todo validate conditions

    collection.findOne(conditions, function(err, resume) {
        callback(err, resume);
    });
};
