process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // http://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment
var server = require('../../server');
var request = require('supertest')(server);
var should = require('should');
var bcrypt = require('bcrypt-nodejs');
var User = require('../../models/user');

describe('createUser: POST /user', function() {

  var user = {
    username: 'createUserUsername',
    email: 'createUserEmail',
    password: 'createUserPassword',
  };

  var url = '/user';

  before(function(done) {
    // TODO: move this into a beforeAll function
    User.remove({}, done);
  });

  it('should return 201 Created', function(done) {
    request.post(url)
      .send(user)
      .expect(201, function(err, res) {
        should.not.exist(err);

        done();
      });
  });

  it('should return 409 CONFLICT when the email already exists', function(done) {
    request.post(url)
      .send({
        username: "different",
        email: user.email,
        password: user.password
      })
      // HTTP status 409 Conflict
      .expect(409, function(err, res) {
        should.not.exist(err);
        res.body.error.should.have.properties({
          field: 'email',
          message: 'Email is already in use, maybe you forgot your password?'
        });

        done();
      });
  });

  it('should return 409 Conflict when the username already exists', function(done) {
    request.post(url)
      .send({
        username: user.username,
        email: "different",
        password: user.password
      })
      // HTTP status 409 Conflict
      .expect(409, function(err, res) {
        should.not.exist(err);
        res.body.error.should.have.properties({
          field: 'username',
          message: 'This username is already taken, please try another one'
        });

        done();
      });
  });
});
