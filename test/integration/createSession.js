process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // https://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment
var server = require('../../server');
var request = require('supertest')(server);
var should = require('should');
var bcrypt = require('bcrypt-nodejs');
var User = require('../../models/user');

describe('createSession: POST /session ', function() {

  var url = '/session';

  var user = {
    username: 'sessionLoginUsername',
    email: 'sessionLoginEmail',
    // FIXME should throw an error if we try to dave a raw Password
    // TODO use a mongoose virtual
    password: 'sessionLoginPassword',
  };
  user.hash = bcrypt.hashSync(user.password);

  before(function(done) {
    User.remove({}, function(err) { // TODO: move this into a beforeAll function
      User.create(user, done);
    });
  });

  it('should return 200 OK and a session for a valid user', function(done) {

    request.post(url)
      .send(user)
      .expect(200, function(err, res) {

        should.not.exist(err);
        res.body.should.have.property('session');

        res.body.should.have.properties({
          auth: true,
          email: user.email,
          message: 'loggedIn',
          username: user.username
        });

        done();
      });
  });

  it('should return 401 Unauthorized for an incorrect password', function(done) {

    request.post(url)
      .send({
        email: user.email,
        password: "different"
      })
      // HTTP status 401 UNAUTHORIZED
      .expect(401, function(err, res) {

        done()
      });
  });

  it('should return 401 Unauthorized for an unregistered email', function(done) {
    request.post(url)
      .send({
        email: "different",
        password: user.password
      })
      // HTTP status 401 UNAUTHORIZED
      .expect(401, function(err, res) {

        done()
      });
  });
});
