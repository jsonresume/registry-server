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
        res.body.url.should.startWith('http://registry.jsonresume.org/');
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
        res.body.should.have.property('url', 'http://registry.jsonresume.org/' + user.username);

        done();
      });
  });

  it('should update resume theme', function(done) {

    request.put('/resume')
      .send({
        password: user.password,
        email: user.email,
        theme: 'flat'
      })
      .expect(200, function(err, res) {
        should.not.exist(err);
        res.body.should.have.property('url', 'http://registry.jsonresume.org/' + user.username);
        // TODO find resume and check theme field

        done();
      });
  });

  it('should not update resume theme with wrongPassword', function(done) {

    request.put('/resume')
      .send({
        password: 'wrongPassword',
        email: user.email,
        theme: 'flat'
      })
      .expect(200, function(err, res) { // TODO return some HTTP error code
        should.not.exist(err);

        // should probably be invalid password not session
        res.body.should.have.property('sessionError', 'invalid session');
        done();
      });
  });

  it('should not update resume theme with non-existant email', function(done) {

    request.put('/resume')
      .send({
        password: user.password,
        email: 'nonExistatnEmail',
        theme: 'flat'
      })
      .expect(200, function(err, res) {
        should.not.exist(err);

        res.body.should.have.property('sessionError', 'invalid session'); // TODO change returned msg to invalid email
        done();
      });
  });

  xit('TODO: should return some error if theme does not exist??');

});
