process.env.MONGOHQ_URL = 'mongodb://localhost:27017/jsonresume-tests';
process.env.POSTMARK_API_KEY = 'POSTMARK_API_TEST'; // https://blog.postmarkapp.com/post/913165552/handling-email-in-your-test-environment

var Q = require('q');
var should = require('should');
var supertest = require("supertest-as-promised")(Q.Promise);
var utils = require('../utils');
var server = require('../../server');
var api = supertest(server),
  apiUtils = utils(api);
var User = require('../../models/user');

describe('checkSession GET /session', function() {

  before(function(done){
    User.remove({}, done);
  });

  var agent = supertest.agent(server), // use cookies
    agentUtils = utils(agent),
    user = utils.getUserForTest(this);

  it('should return {auth: false} if there is no session', function() {

    return agent.get('/session')
      .send()
      .expect(utils.property({
        auth: false
      }));
  });

  it('should return {auth: true} if there is a valid session', function() {

    return agentUtils.createUser(user)
      .then(function() {
        return agent.get('/session')
          .send()
          .expect(utils.property({
            auth: true
          }));
      });
  });
});
