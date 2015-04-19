var request = require('supertest');
var server = require('../server');
var HttpStatus = require('http-status-codes');

var api = request(server);

describe('API', function() {
    describe('/', function() {

      it('should return 200 OK', function(done) {
        api.get('/')
            .expect(200, done);
      });

    });

    describe('/user', function() {
        var user = {
            username: "test user",
            email: "user@example.com",
            password: "password"
        };

        describe('POST', function () {
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
                        password: "password"
                    })
                    .expect(HttpStatus.CONFLICT, done);
            });

            it('should return 409 Conflict when the username already exists', function(done) {
                api.post('/user')
                    .send({
                        username: user.username,
                        email: "different",
                        password: "password"
                    })
                    .expect(HttpStatus.CONFLICT, done);
            });
        });

    });
});
