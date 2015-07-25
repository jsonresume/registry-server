var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
  username: {
    type: String
  },
  email: {
    type: String
  },
  password: {
    type: String
  },
  hash: { // TODO make virtual
    type: String
  }
});


module.exports = mongoose.model('User', userSchema);
