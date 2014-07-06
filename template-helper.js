var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var TEMPLATE_PATH = "./templates/";
var templatesKeeper = {};

/**
 * read all templates and cache them
 */
var templates = _.map( fs.readdirSync(TEMPLATE_PATH), function(filename, i) {
  console.log(filename.split('.template'));
  if(filename.split('.template').length === 1) {
    return;
  }
  var page = filename.split('.template')[0];
  if(!templatesKeeper[page]) {
    templatesKeeper[page] = fs.readFileSync(path.resolve(__dirname, TEMPLATE_PATH + page + '.template'), 'utf8');
  }
  return filename.split('.template')[0];
});

exports.get = function(page){
  if(templates.indexOf(page) > -1) {
    return templatesKeeper[page];
  } else {
    return '';
  }
}
