var MongoClient = require('mongodb').MongoClient;
var defaultMongoUrl = "mongodb://localhost:27017/jsonresume";
if (!process.env.MONGOHQ_URL) {
    console.log("Using default MONGOHQ_URL=" + defaultMongoUrl);
}
var mongoUrl = process.env.MONGOHQ_URL || defaultMongoUrl;

module.exports.init = function(callback) {

    MongoClient.connect(process.env.MONGOHQ_URL, function(err, db) {
        if (err) {
            return callback(err);
        }

        module.exports.db = db;
        module.exports.User = db.collection('users');
        module.exports.Resume = db.collection('resumes');

        callback();
    });
};
