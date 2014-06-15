var express = require("express");

var Mustache = require('mustache');
var resumeToText = require('resume-to-text');
var resumeToHTML = require('resume-to-html');

var app = express();
var fs = require('fs');

app.get('/resume/:username.:format', function(req, res) {
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

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});