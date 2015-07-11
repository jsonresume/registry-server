process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // http://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment

var bcrypt = require('bcrypt-nodejs');
var should = require('should');
var fixtures = require('./fixtures');
// var supertest = require('supertest');
var Q = require('q');
var supertest = require("supertest-as-promised")(Q.Promise);
var HttpStatus = require('http-status-codes');
var nock = require('nock');
var utils = require('./utils');
var server = require('../server');
var api = supertest(server);
var apiUtils = utils(api);



var User = require('../models/user');

nock.enableNetConnect('127.0.0.1'); // HTTP requests outside of localhost are blocked

describe('/', function() {
  it('should return 200 OK', function(done) {
    api.get('/')
      .expect(200, function(err, res) {
        should.not.exist(err);

        done();
      });
  });
});

describe('User routes: POST', function() {
  var user = utils.getUserForTest(this);

  it('`/user` should return 201 Created', function(done) {
    api.post('/user')
      .send(user)
      .expect(HttpStatus.CREATED, function(err, res) {
        should.not.exist(err);

        done();
      });
  });

  it('`/user` should return 409 CONFLICT when the email already exists', function(done) {
    api.post('/user')
      .send({
        username: "different",
        email: user.email,
        password: user.password
      })
      .expect(HttpStatus.CONFLICT, function(err, res) {
        should.not.exist(err);

        done();
      });
  });

  it('`/user` should return 409 Conflict when the username already exists', function(done) {
    api.post('/user')
      .send({
        username: user.username,
        email: "different",
        password: user.password
      })
      .expect(HttpStatus.CONFLICT, function(err, res) {
        // should.not.exsit(err);

        done();

      });
  });

  it('`/account` should return a 401 Unauthorized Error when attempting to change password with incorrect credentials', function(done) {

    api.put('/account')
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

  it('`/account` should return a 401 Unauthorized Error when attempting to change password with invalid password', function(done) {

    api.put('/account')
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

  it('`/account` change user password', function(done) {

    api.put('/account')
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

  it('`/account` should delete user account', function(done) {

    api.delete('/account')
      .send({
        email: user.email,
        password: 'newPassword',
      })
      .expect(200, function(err, res) {
        should.not.exist(err);

        done();
      });
  });
});

describe('/session', function() {

  describe('POST', function() {
    var user = fixtures.user.sessionUser;
    user.hash = bcrypt.hashSync(user.password);

    before(function(done) {
      // create a test user
      User.create(user, done);
    });

    // TODO test session from resume-cli


    it('POST: should return 200 OK and a session for a valid user', function(done) {

      api.post('/session')
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

    it('POST: should return 401 Unauthorized for an incorrect password', function(done) {
      api.post('/session')
        .send({
          email: user.email,
          password: "different"
        })
        .expect(HttpStatus.UNAUTHORIZED, function(err, res) {

          done()

        });
    });

    it('POST: should return 401 Unauthorized for an unregistered email', function(done) {
      api.post('/session')
        .send({
          email: "different",
          password: user.password
        })
        .expect(HttpStatus.UNAUTHORIZED, function(err, res) {

          done()

        });
    });

  });
});

describe('GET', function() {
  var agent = supertest.agent(server), // use cookies
    agentUtils = utils(agent),
    user = utils.getUserForTest(this);

  it('should return {auth: false} if there is no session', function() {
    return agent.get('/session')
      .send()
      .expect(utils.property({
        auth: false
      }));
  });

  it('should return {auth: true} if there is a valid session', function() {
    return agentUtils.createUser(user)
      .then(function() {
        return agent.get('/session')
          .send()
          .expect(utils.property({
            auth: true
          }));
      });
  });
});

describe('DELETE session ID', function() {
  var agent = supertest.agent(server), // use cookies
    agentUtils = utils(agent),
    user = utils.getUserForTest(this);

  before(function() {
    return agentUtils.createUser(user);
  });

  it('should end the session', function() {
    return agent.post('/session')
      .send(user)
      .then(function(res) {
        expect(res.body.session).to.exist;
        return agent.delete('/session/' + res.body.session)
          .send()
          .expect(HttpStatus.OK)
          .expect(utils.property({
            auth: false
          }));
      })
      .then(function() {
        return agent.get('/session')
          .send()
          .expect(utils.property({
            auth: false
          }));
      });


  });
});

describe('/_username_ GET:', function() {

  var user = fixtures.user.test3;
  user.hash = bcrypt.hashSync(user.password);

  before(function(done) {
    // create a test user
    User.create(user, done);
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

        console.log(err, res.body);

        done();
      });
  });

  it.only('should return 200 OK for a valid user with a resume', function() {
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

describe('/stats', function() {
  it('should return stats', function(done) {
    api.get('/stats')
      .expect(200, function(err, res) {
        should.not.exist(err);
        // TODO acturlly test stat numbers
        res.body.should.have.property('userCount');
        res.body.should.have.property('resumeCount');
        res.body.should.have.property('views');

        done();
      });
  });
});

describe('TODO:', function() {
  it('fix renderMarkdonw');
  it('remove redis from request middleware');
});
