var request = require('supertest');
var server = require('../server');

var api = request(server);

describe('Homepage', function() {

  it('returns 200 OK', function(done) {
    api.get('/')
    .expect(200, done)
  });

});
