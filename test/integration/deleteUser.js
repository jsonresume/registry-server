process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // https://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment
var server = require('../../server');
var request = require('supertest')(server);
var should = require('should');
var bcrypt = require('bcrypt-nodejs');
var User = require('../../models/user');

describe('deleteUser: DELETE /account ', function() {

  var url = '/account';

  var user = {
    username: 'deleteUserUsername',
    email: 'deleteUserEmail',
    // FIXME should throw an error if we try to dave a raw Password
    // TODO use a mongoose virtual
    password: 'deleteUserPassword',
  };
  user.hash = bcrypt.hashSync(user.password);

  before(function(done) {
    User.remove({}, function(err) { // TODO: move this into a beforeAll function
      User.create(user, done);
    });
  });

  it('should delete user account', function(done) {

    request.delete(url)
      .send({
        email: user.email,
        password: user.password,
      })
      .expect(200, function(err, res) {
        should.not.exist(err);
        res.body.should.have.properties({
          message: '\nYour account has been successfully deleted.'
        });

        done();
      });
  });
});
