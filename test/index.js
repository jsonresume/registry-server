process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
var mongoUrl = process.env.MONGOHQ_URL;
var mongo = require('../db');

// This bit of code runs before ANY tests start.
before(function beforeAllTests(done) {

    // Connect to db before running tests
    mongo.connect(mongoUrl, function(err) {
        if (err) {
            console.log('Error connecting to Mongo.', {
                err: err
            });
            return process.exit(1)
        }

        mongo.drop(done);
    });
});
