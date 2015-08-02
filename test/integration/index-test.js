process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // http://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment

var should = require('should');
var server = require('../../server');
var request = require('supertest')(server);

describe('/', function() {
  it('should return 200 OK', function(done) {
    request.get('/')
      .expect(200, function(err, res) {
        should.not.exist(err);

        done();
      });
  });
});
