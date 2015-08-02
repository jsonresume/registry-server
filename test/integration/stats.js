process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // http://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment
var server = require('../../server');
var request = require('supertest')(server);
var should = require('should');

describe('/stats', function() {
  it('should return stats', function(done) {
    request.get('/stats')
      .expect(200, function(err, res) {
        console.log(res.body);
        should.not.exist(err);
        // TODO acturlly test stat numbers
        res.body.should.have.property('userCount');
        res.body.should.have.property('resumeCount');
        res.body.should.have.property('views');

        done();
      });
  });
});
