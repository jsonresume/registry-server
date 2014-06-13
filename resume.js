var fs = require('fs');
var Mustache = require('mustache');
var _ = require('lodash');


var resumeTemplate = fs.readFileSync('layout.template', 'utf8');
var resumeData = JSON.parse(fs.readFileSync('thomasdavis.json', 'utf8'));

var resumeHTML = Mustache.render(resumeTemplate, resumeData);

fs.writeFileSync('thomasdavis.html', resumeHTML, 'utf8');
