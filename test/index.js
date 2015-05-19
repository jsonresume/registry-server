var Q = require('q');
var supertest = require("supertest-as-promised")(Q.Promise);
var HttpStatus = require('http-status-codes');
var utils = require('./utils');

process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // http://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment
var server = require('../server');
var api = supertest(server),
    apiUtils = utils(api);


describe('API', function() {

    describe('/', function() {
        it('should return 200 OK', function() {
            return api.get('/')
                .expect(200);
        });
    });

    describe('/user', function() {
        describe('POST', function () {
            var user = utils.getUserForTest(this);

            it('should return 201 Created', function() {
                return api.post('/user')
                    .send(user)
                    .expect(HttpStatus.CREATED);
            });

            it('should return 409 CONFLICT when the email already exists', function() {
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
            var user = utils.getUserForTest(this),
                hasSessionObject = function(res) {
                    if (!('session' in res.body)) return "Body is missing session property"
                };

            before(function() {
                return apiUtils.createUser(user);
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

        describe('GET', function() {
            var agent = supertest.agent(server), // use cookies
                agentUtils = utils(agent),
                user = utils.getUserForTest(this);

            it('should return {auth: false} if there is no session', function() {
                return agent.get('/session')
                    .send()
                    .expect(utils.property({auth: false}));
            });

            it('should return {auth: true} if there is a valid session', function() {
                return agentUtils.createUser(user)
                    .then(function() {
                        return agent.get('/session')
                            .send()
                            .expect(utils.property({auth: true}));
                    });
            });
        });
    });

    describe('/_username_', function() {
        describe('GET', function() {
            var user = utils.getUserForTest(this);

            before(function() {
                return apiUtils.createUser(user);
            });

            it('should return 404 Not Found for an invalid user', function() {
                return api.get('/not_a_real_user')
                    .send()
                    .expect(HttpStatus.NOT_FOUND);
            });

            it('should return 404 Not Found for a valid user with no resume', function() {
                return api.get('/'+user.username)
                    .send()
                    .expect(HttpStatus.NOT_FOUND);
            });

            it('should return 200 OK for a valid user with a resume', function() {
                // this test has a dependency on the theme manager:
                /*
                    request
                    .post('http://themes.jsonresume.org/theme/' + theme)
                */
                // this should probably be mocked
                return api.post('/resume')
                    .send({
                        email: user.email,
                        password: user.password,
                        resume: {
                            test: "Put a real resume here?"
                        }
                    })
                    .then(function() {
                        return api.get('/'+user.username)
                            .send()
                            .expect(HttpStatus.OK);
                    });
            });
        });
    });
});
