var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({}, { strict: false });

module.exports = mongoose.model('User', userSchema);
