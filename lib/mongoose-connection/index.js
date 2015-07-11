var mongoose = require('mongoose');

mongoose.connection.on('error', function(err) {
	console.log('Mongoose connection error', { err: err });
	throw new Error('database connection error');
});

mongoose.connection.on('open', function() {
	console.log('Mongoose connection open');
});

var mongoUrl = process.env.MONGOHQ_URL || 'mongodb://localhost:27017/jsonresume';

console.log('Using mongoUrl: ', mongoUrl);

mongoose.connect(mongoUrl);

module.exports = mongoose;
