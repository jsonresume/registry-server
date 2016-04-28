process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
var request = require('supertest')(require('../../server'));
var bcrypt = require('bcrypt-nodejs');
var should = require('should');
var fixtures = require('../fixtures');
var User = require('../../models/user');

describe('Resumes: ', function() {

  var user = fixtures.user.default;
  user.hash = bcrypt.hashSync(user.password);

  before(function(done) {
    // create a test user
    User.create(user, done);
  });

  var resumeJson = require('../resume.json');

  it('should create a new guest resume', function(done) {

    request.post('/resume')
      .send({
        guest: true,
        resume: resumeJson
      })
      .expect(200, function(err, res) {

        should.not.exist(err);
        res.body.should.have.property('url');
        res.body.url.should.startWith('https://registry.jsonresume.org/');
        // url should end with the randomly generated guestUsername
        // TODO test that test resume was actually created.

        done();
      });
  });

  it('should create a resume for an existing user', function(done) {

    request.post('/resume')
      .send({
        password: user.password,
        email: user.email,
        resume: resumeJson
      })
      .expect(200, function(err, res) {
        should.not.exist(err);
        res.body.should.have.property('url', 'https://registry.jsonresume.org/' + user.username);

        done();
      });
  });

});
