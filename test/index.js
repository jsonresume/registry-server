var Q = require('q');
var request = require("supertest-as-promised")(Q.Promise);
var server = require('../server');
var HttpStatus = require('http-status-codes');

var api = request(server),
    cleanUsername = function(s) {
        // remove spaces and slashes to make nice URLs
        return s.replace(/ /g, "_").replace("/", "");
    },
    getTestName = function(test) {
        return cleanUsername(test.fullTitle())
    },
    getUser = function(test) {
        var testName = getTestName(test);
        return {
                username: testName,
                email: testName+"@example.com",
                password: "password"
            };
    },
    createUser = function(user) {
        return api.post('/user')
            .send(user)
            .then(function(res) {
                return res.body;
            });
    };

describe('API', function() {
    describe('/', function() {
        it('should return 200 OK', function() {
            return api.get('/')
                .expect(200);
        });
    });

    describe('/user', function() {
        describe('POST', function () {
            var user = getUser(this);

            it('should return 201 Created', function() {
                return api.post('/user')
                    .send(user)
                    .expect(HttpStatus.CREATED);
            });

            it('should return 409 CONFLICTflict when the email already exists', function() {
                return api.post('/user')
                    .send({
                        username: "different",
                        email: user.email,
                        password: user.password
                    })
                    .expect(HttpStatus.CONFLICT);
            });

            it('should return 409 Conflict when the username already exists', function() {
                return api.post('/user')
                    .send({
                        username: user.username,
                        email: "different",
                        password: user.password
                    })
                    .expect(HttpStatus.CONFLICT);
            });
        });
    });

    describe('/session', function() {
        describe('POST', function () {
            var user = getUser(this),
                hasSessionObject = function(res) {
                    if (!('session' in res.body)) return "Body is missing session property"
                };

            before(function() {
                return createUser(user);
            });

            it('should return 200 OK and a session for a valid user', function() {
                return api.post('/session')
                    .send(user)
                    .expect(HttpStatus.OK)
                    .expect(hasSessionObject);
            });

            it('should return 401 Unauthorized for an incorrect password', function() {
                return api.post('/session')
                    .send({
                        email: user.email,
                        password: "different"
                    })
                    .expect(HttpStatus.UNAUTHORIZED);
            });

            it('should return 401 Unauthorized for an unregistered email', function() {
                return api.post('/session')
                    .send({
                        email: "different",
                        password: user.password
                    })
                    .expect(HttpStatus.UNAUTHORIZED);
            });
        });
    });
});
