var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var resumeSchema = new Schema({}, { strict: false });

module.exports = mongoose.model('Resume', resumeSchema);
