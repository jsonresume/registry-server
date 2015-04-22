var request = require('supertest');
var server = require('../server');
var HttpStatus = require('http-status-codes');

var api = request(server),
    replaceSpaces = function(s) {
        return s.replace(/ /g, "_");
    },
    getTestName = function(test) {
        return replaceSpaces(test.fullTitle())
    },
    getUser = function(test) {
        var testName = getTestName(test);
        return {
                username: testName,
                email: testName+"@example.com",
                password: "password"
            };
    };

describe('API', function() {
    describe('/', function() {

      it('should return 200 OK', function(done) {
        api.get('/')
            .expect(200, done);
      });

    });

    describe('/user', function() {
        describe('POST', function () {
            var user = getUser(this);

            it('should return 201 Created', function(done) {
                api.post('/user')
                    .send(user)
                    .expect(HttpStatus.CREATED, done);
            });

            it('should return 409 Conflict when the email already exists', function(done) {
                api.post('/user')
                    .send({
                        username: "different",
                        email: user.email,
                        password: user.password
                    })
                    .expect(HttpStatus.CONFLICT, done);
            });

            it('should return 409 Conflict when the username already exists', function(done) {
                api.post('/user')
                    .send({
                        username: user.username,
                        email: "different",
                        password: user.password
                    })
                    .expect(HttpStatus.CONFLICT, done);
            });
        });
    });

    describe('/session', function() {
        describe('POST', function () {
            var user = getUser(this);

            before(function(done) {
                api.post('/user')
                    .send(user)
                    .end(function() {
                        done();
                    });
            });

            it('should return 200 OK for a valid user', function(done) {
                api.post('/session')
                    .send(user)
                    .expect(HttpStatus.OK, done);
            });

            it('should return 401 Unauthorized for an incorrect password', function(done) {
                api.post('/session')
                    .send({
                        email: user.email,
                        password: "different"
                    })
                    .expect(HttpStatus.UNAUTHORIZED, done);
            });

            it('should return 401 Unauthorized for an unregistered email', function(done) {
                api.post('/session')
                    .send({
                        email: "different",
                        password: user.password
                    })
                    .expect(HttpStatus.UNAUTHORIZED, done);
            });
        });
    });
});
