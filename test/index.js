var chai = require('chai');
global.expect = chai.expect;

chai.use(require('chai-properties'));


var mongoose = require('mongoose');
process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
// register model schemas
require('../models/user');
require('../models/resume');


require('../lib/mongoose-connection');

function dropMongoDatabase(callback) {
	// Drop the database once connected (or immediately if connected).
	var CONNECTION_STATES = mongoose.Connection.STATES;
	var readyState = mongoose.connection.readyState;
	var connected = false;

	var drop = function() {
		mongoose.connection.db.dropDatabase(function(err) {
			if (err) {
				throw err;
			}
			callback(err);
		});
	};

	if (CONNECTION_STATES[readyState] === 'connected') {
		drop();
	} else {
		mongoose.connection.once('connected', drop);
	}
}

// This bit of code runs before ANY tests start.
before(function beforeAllTests(done) {

		dropMongoDatabase(done);
});
