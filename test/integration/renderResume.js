process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // http://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment
var Q = require('q');
var bcrypt = require('bcrypt-nodejs');
var should = require('should');
var fixtures = require('../fixtures');
var supertest = require("supertest-as-promised")(Q.Promise);
var xrequest = require('supertest');
var HttpStatus = require('http-status-codes');
var nock = require('nock');
var utils = require('../utils');
var server = require('../../server');
var api = supertest(server),
  apiUtils = utils(api);

var User = require('../../models/user');
var Resume = require('../../models/resume');



describe('renderResume: GET /:username ', function() {

  var user = fixtures.user.test3;
  user.hash = bcrypt.hashSync(user.password);

  before(function(done) {
    // create a test user
    User.remove({}, function(err) {
      Resume.remove({}, function(err) {
        User.create(user, done);
      });
    });
  });

  it('should return 404 Not Found for an invalid user', function(done) {
    api.get('/not_a_real_user')
      .send()
      .expect(HttpStatus.NOT_FOUND, function(err, res) {
        should.not.exist(err);

        done();
      });
  });

  it('should return 404 Not Found for a valid user with no resume', function(done) {

    api.get('/' + user.username)
      .send()
      .expect(HttpStatus.NOT_FOUND, function(err, res) {
        should.not.exist(err);

        done();
      });
  });

  it('should return 200 OK for a valid user with a resume', function() {
    var themeReq = nock('http://themes.jsonresume.org')
      .post('/theme/' + server.DEFAULT_THEME)
      .reply(200, 'An example resume');
    return api.post('/resume')
      .send({
        email: user.email,
        password: user.password,
        resume: {
          test: "Put a real resume here?"
        }
      })
      .then(function() {
        return api.get('/' + user.username)
          .send()
          .expect(HttpStatus.OK)
          .expect('An example resume');
      })
      .then(function() {
        expect(themeReq.isDone()).to.be.true;
      });
  });

  it('should return 500 Internal Server Error if the theme manager service returns an error', function() {
    var themeReq = nock('http://themes.jsonresume.org')
      .post('/theme/' + server.DEFAULT_THEME)
      .replyWithError({
        message: 'server is down'
      });
    return api.post('/resume')
      .send({
        email: user.email,
        password: user.password,
        resume: {
          test: "Put a real resume here?"
        }
      })
      .then(function() {
        return api.get('/' + user.username)
          .send()
          .expect(HttpStatus.INTERNAL_SERVER_ERROR)
          .expect({
            message: 'server is down'
          });
      })
      .then(function() {
        expect(themeReq.isDone()).to.be.true;
      });
  });
});
