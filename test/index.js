var Q = require('q');
var supertest = require("supertest-as-promised")(Q.Promise);
var HttpStatus = require('http-status-codes');
var nock = require('nock');
var utils = require('./utils');

process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // http://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment
var server = require('../server');
var api = supertest(server),
    apiUtils = utils(api);

nock.enableNetConnect('127.0.0.1'); // HTTP requests outside of localhost are blocked

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
            var user = utils.getUserForTest(this);

            before(function() {
                return apiUtils.createUser(user);
            });

            it('should return 200 OK and a session for a valid user', function() {
                return api.post('/session')
                    .send(user)
                    .expect(HttpStatus.OK)
                    .expect(utils.property('session'));
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

        describe('DELETE session ID', function () {
            var agent = supertest.agent(server), // use cookies
                agentUtils = utils(agent),
                user = utils.getUserForTest(this),
                hasSessionObject = function(res) {
                    if (!('session' in res.body)) return "Body is missing session property"
                };

            before(function() {
                return agentUtils.createUser(user);
            });

            it('should end the session', function() {
                return agent.post('/session')
                    .send(user)
                    .then(function(res) {
                        expect(res.body.session).to.exist;
                        return agent.delete('/session/'+res.body.session)
                            .send()
                            .expect(HttpStatus.OK)
                            .expect(utils.property({auth: false}));
                    })
                    .then(function(){
                        return agent.get('/session')
                            .send()
                            .expect(utils.property({auth: false}));
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
                var themeReq = nock('http://themes.jsonresume.org')
                                .post('/theme/'+server.DEFAULT_THEME)
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
                        return api.get('/'+user.username)
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
                                .post('/theme/'+server.DEFAULT_THEME)
                                .replyWithError({message: 'server is down'});
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
                            .expect(HttpStatus.INTERNAL_SERVER_ERROR)
                            .expect({message: 'server is down'});
                    })
                    .then(function() {
                        expect(themeReq.isDone()).to.be.true;
                    });
            });
        });
    });
});
