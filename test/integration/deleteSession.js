process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // http://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment

var Q = require('q');
var should = require('should');
var supertest = require("supertest-as-promised")(Q.Promise);
var utils = require('../utils');
var server = require('../../server');
var HttpStatus = require('http-status-codes');
var api = supertest(server),
  apiUtils = utils(api);
var User = require('../../models/user');

describe('DELETE session ID', function() {

  var agent = supertest.agent(server), // use cookies
    agentUtils = utils(agent),
    user = utils.getUserForTest(this);

  before(function(done){
    User.remove({}, function(){
      agentUtils.createUser(user).then(function(err){
        done();
      });
    });
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
