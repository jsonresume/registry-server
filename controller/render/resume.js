var request = require('superagent');
var Mustache = require('mustache');
var templateHelper = require('../../template-helper');
var HttpStatus = require('http-status-codes');
var resumeToText = require('resume-to-text');
var resumeToMarkdown = require('resume-to-markdown');
var Pusher = require('pusher');
var pdf = require('pdfcrowd');
var client = new pdf.Pdfcrowd('thomasdavis', '7d2352eade77858f102032829a2ac64e');
var pusher = null;
if (process.env.PUSHER_KEY) {
  pusher = new Pusher({
    appId: '83846',
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET
  });
};
var realTimeViews = 0;
var DEFAULT_THEME = 'modern';
var Resume = require('../../models/resume');

module.exports = function renderResume(req, res, err) {
  realTimeViews++;

  var redis = req.redis;

  redis.get('views', function(err, views) {
    if (err) {
      redis.set('views', 0);
    } else {
      redis.set('views', views * 1 + 1, redis.print);

    }
    // console.log(views);

    if (pusher !== null) {
      pusher.trigger('test_channel', 'my_event', {
        views: views
      });
    };
  });

  var themeName = req.query.theme || DEFAULT_THEME;
  var uid = req.params.uid;
  var format = req.params.format || req.headers.accept || 'html';
console.log(uid);
  Resume.findOne({
    'jsonresume.username': uid,
  }, function(err, resume) {
    console.log('render resuem', resume);
    if (err) {
      return next(err);
    }
    if (!resume) {
      var page = Mustache.render(templateHelper.get('noresume'), {});
      res.status(HttpStatus.NOT_FOUND).send(page);
      return;
    }

    resume = resume.toObject();

    if (typeof resume.jsonresume.passphrase === 'string' && typeof req.body.passphrase === 'undefined') {

      var page = Mustache.render(templateHelper.get('password'), {});
      res.send(page);
      return;
    }
    if (typeof req.body.passphrase !== 'undefined' && req.body.passphrase !== resume.jsonresume.passphrase) {
      res.send('Password was wrong, go back and try again');
      return;
    }
    var content = '';
    if (/json/.test(format)) {
      if (typeof req.session.username === 'undefined') {
        delete resume.jsonresume; // This removes our registry server config vars from the resume.json
      }
      delete resume._id; // This removes the document id of mongo
      content = JSON.stringify(resume, undefined, 4);
      res.set({
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(content, 'utf8') // TODO - This is a hack to try get the right content length
          // http://stackoverflow.com/questions/17922748/what-is-the-correct-method-for-calculating-the-content-length-header-in-node-js
      });

      res.send(content);
    } else if (/txt/.test(format)) {
      content = resumeToText(resume, function(plainText) {
        res.set({
          'Content-Type': 'text/plain',
          'Content-Length': plainText.length
        });
        res.send(200, plainText);
      });
    } else if (/md/.test(format)) {
      console.log(resume);
      resumeToMarkdown(resume, function(markdown, errs) {
        // TODO fix resumeToMarkdown validation errors
        console.log(markdown, errs);
        res.set({
          'Content-Type': 'text/plain',
          'Content-Length': markdown.length
        });
        res.send(markdown);
      })
    } else if (/pdf/.test(format)) {
      // this code is used for web-based pdf export such as http://registry.jsonresume.org/thomasdavis.pdf - see line ~310 for resume-cli export
      console.log('Come on PDFCROWD');
      var theme = req.query.theme || resume.jsonresume.theme || themeName;
      request
        .post('http://themes.jsonresume.org/theme/' + theme)
        .send({
          resume: resume
        })
        .set('Content-Type', 'application/json')
        .end(function(err, response) {
          client.convertHtml(response.text, pdf.sendHttpResponse(res, null, uid + ".pdf"), {
            use_print_media: "true"
          });

        });


    } else {
      var theme = req.query.theme || resume.jsonresume.theme || themeName;
      request
        .post('http://themes.jsonresume.org/theme/' + theme)
        .send({
          resume: resume
        })
        .set('Content-Type', 'application/json')
        .end(function(err, response) {
          if (err) res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err);
          else res.send(response.text);
        });
      /*
      resumeToHTML(resume, {

      }, function(content, errs) {
          console.log(content, errs);
          var page = Mustache.render(templateHelper.get('layout'), {
              output: content,
              resume: resume,
              username: uid
          });
          res.send(content);
      });
      */
    }
  });
};
