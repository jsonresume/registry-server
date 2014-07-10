var test = require('tape');
var request = require('superagent');
var _ = require('lodash');

var schema = require('resume-schema');

var user = {
    username: 'richardhendricks',
    email: 'richardhendricks@example.com',
    password: 'password'
};

test('JSON-LD context serving', function(t) {
    t.plan(1);
    request
        .get('http://localhost:5000/')
        .set('Accept', 'application/ld+json')
        .end(function(err, res){
            t.notOk(err, 'no error');
        });
});


test('new user creation', function(t) {
    t.plan(1);
    request
        .post('http://localhost:5000/user')
        .send(user)
        .end(function(err, res){
            t.notOk(err, 'no error');
        });
});

test('resume posting', function(t) {
    t.plan(1);
    request
        .post('http://localhost:5000/resume')
        .send(_.extend({resume: schema.resumeJson}, user))
        .end(function(err, res){
            t.notOk(err, 'no error');
        });
});

test('resume fetching', function(t) {
    t.plan(1);
    request
        .get('http://localhost:5000/richardhendricks')
        .end(function(err, res){
            t.notOk(err, 'no error');
        });
});
