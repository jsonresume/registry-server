process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // https://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment
var server = require('../../server');
var request = require('supertest')(server);
var should = require('should');
var bcrypt = require('bcrypt-nodejs');
var User = require('../../models/user');

describe('changePassword: PUT /account ', function() {

  var url = '/account';

  var user = {
    username: 'changePasswordUsername',
    email: 'changePasswordEmail',
    // FIXME should throw an error if we try to dave a raw Password
    // TODO use a mongoose virtual
    password: 'changePasswordPassword',
  };
  user.hash = bcrypt.hashSync(user.password);

  before(function(done) {
    User.remove({}, function(err) { // TODO: move this into a beforeAll function
      User.create(user, done);
    });
  });

  it('should return a 401 Unauthorized Error when attempting to change password with incorrect credentials', function(done) {

    request.put(url)
      .send({
        email: 'someRandomEmail',
        currentPassword: user.password,
        newPassword: 'newPassword'
      })
      .expect(401, function(err, res) {
        should.not.exist(err);
        res.body.should.have.properties({
          message: 'email not found'
        })

        done();
      });
  });

  it('should return a 401 Unauthorized Error when attempting to change password with invalid password', function(done) {

    request.put(url)
      .send({
        email: user.email,
        currentPassword: 'someWrongPassword',
        newPassword: 'newPassword'
      })
      .expect(401, function(err, res) {
        should.not.exist(err);
        res.body.should.have.properties({
          message: 'invalid password'
        })

        done();
      });
  });

  it('change user password', function(done) {

    request.put(url)
      .send({
        email: user.email,
        currentPassword: user.password,
        newPassword: 'newPassword'
      })
      .expect(200, function(err, res) {
        should.not.exist(err);

        done();
      });
  });
});
