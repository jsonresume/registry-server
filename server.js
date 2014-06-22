var express = require("express");

var Mustache = require('mustache');
var resumeToText = require('resume-to-text');
var resumeToHTML = require('resume-to-html');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');

var app = express();

var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
    postmark.send({
        "From": "admin@jsonresume.org", 
        "To": "thomasalwyndavis@gmail.com", 
        "Subject": "Welcome to JsonResume.org", 
        "TextBody": "You suck"
    }, function(error, success) {
        if(error) {
            console.error("Unable to send via postmark: " + error.message);
            return;
        }
        console.info("Sent to postmark for delivery")
    });

var MongoClient = require('mongodb').MongoClient;
var mongo = require('mongodb');
app.use(bodyParser());
var fs = require('fs');
var guid = (function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return function() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  };
})();
function S4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  };

MongoClient.connect(process.env.MONGOHQ_URL, function(err, db) {
  app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
  });
  app.get('/resume/user/:username.:format', function(req, res) {
  	var resume = JSON.parse(fs.readFileSync(req.params.username + '.json', 'utf8'));
  	console.log(req.params.format);
    	var format = req.params.format;

    	var content = '';
    	switch(format) {
    		case 'json':
    			content =  JSON.stringify(resume, undefined, 4);
    			res.send(content);
    			break;
    		case 'txt':
    			content = resumeToText.resumeToText(resume, function (plainText){
    				res.set({'Content-Type': 'text/plain',
    					'Content-Length': plainText.length});

    				res.set('Cba', 'text/plain');
    				res.type('text/plain')
  				res.send(200,plainText);
    			});
    			break
    		default:
    			resumeToHTML(resume, function (content){
    				res.send(content);
    			});

    	}

  });
  app.get('/:uid', function(req, res) {
    db.collection('resumes').findOne({'jsonresume.username' : req.params.uid, }, function(err, resume) {
    console.log(resume);
      var format = 'html';//req.params.format;

      var content = '';
      switch(format) {
        case 'json':
          content =  JSON.stringify(resume, undefined, 4);
          res.send(content);
          break;
        case 'txt':
          content = resumeToText.resumeToText(resume, function (plainText){
            res.set({'Content-Type': 'text/plain',
              'Content-Length': plainText.length});

            res.set('Cba', 'text/plain');
            res.type('text/plain')
          res.send(200,plainText);
          });
          break
        default:
          resumeToHTML(resume, function (content){
            res.send(content);
          });

      }
    });
  });
  app.get('/resume/:uid.:format', function(req, res) {
  	console.log(resumes);
  	var resume = resumes[req.params.uid];
  	console.log(req.params.format);
    	var format = req.params.format;

    	var content = '';
    	switch(format) {
    		case 'json':
    			content =  JSON.stringify(resume, undefined, 4);
    			res.send(content);
    			break;
    		case 'txt':
    			content = resumeToText.resumeToText(resume, function (plainText){
    				res.set({'Content-Type': 'text/plain',
    					'Content-Length': plainText.length});

    				res.set('Cba', 'text/plain');
    				res.type('text/plain')
  				res.send(200,plainText);
    			});
    			break
    		default:
    			resumeToHTML(resume, function (content){
    				res.send(content);
    			});

    	}

  });

  app.post('/resume', function (req, res) {
    var password = req.body.password;
    var email = req.body.email;
    console.log(req.body);
    if(!req.body.guest) {
      db.collection('users').findOne({'email' : email }, function(err, user) {
        if(user && bcrypt.compareSync(password, user.hash)) {
        	var resume = req.body && req.body.resume || {};
          resume.jsonresume = {
            username: user.username
          };
          console.log('inserted');
          db.collection('resumes').update({'jsonresume.username': user.username}, resume, {upsert: true, safe: true}, function(err, resume){
            res.send({url:'http://registry.jsonresume.org/' + user.username});
          });
        } else {
          console.log('deleted');
          res.send({message:'ERRORRRSSSS'});
        }
      });
    } else {
      var guestUsername = S4()+S4();
      var resume = req.body && req.body.resume || {};
      resume.jsonresume = {
        username: guestUsername
      };
      console.log('inserted');
      db.collection('resumes').insert(resume, { safe: true}, function(err, resume){
        res.send({url:'http://registry.jsonresume.org/' + guestUsername});
      });
    }
  });

  app.post('/user', function (req, res) {

    console.log(req.body);
    db.collection('users').findOne({'email' : req.body.email}, function(err, user) {

      if(user) {
        res.send({error: {field: 'email', message: 'Email is already in use, maybe you forgot your password?'}});
      } else {

        db.collection('users').findOne({'username' : req.body.username}, function(err, user) {
          if(user) {
            res.send({error: {field: 'username', message: 'This username is already taken, please try another one'}});
          } else {
            var hash = bcrypt.hashSync(req.body.password);
                postmark.send({
                    "From": "admin@jsonresume.org", 
                    "To": req.body.email, 
                    "Subject": "Welcome to JsonResume.org", 
                    "TextBody": "You suck"
                }, function(error, success) {
                    if(error) {
                        console.error("Unable to send via postmark: " + error.message);
                        return;
                    }
                    console.info("Sent to postmark for delivery")
                });
            db.collection('users').insert({username:req.body.username, email: req.body.email, hash: hash}, {safe: true}, function(err, user){
              res.send({message: "success"});
            });
          }
        });
      }

    });
  });

  var port = Number(process.env.PORT || 5000);
  app.listen(port, function() {
    console.log("Listening on " + port);
  });
})