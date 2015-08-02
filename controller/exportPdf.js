var request = require('superagent');
var pdf = require('pdfcrowd');
var client = new pdf.Pdfcrowd('thomasdavis', '7d2352eade77858f102032829a2ac64e');

// this code is used by resume-cli for pdf export, see line ~188 for web-based export
module.exports = function exportPdf(req, res) {

  request
    .post('http://themes.jsonresume.org/theme/' + req.body.theme)
    .send({
      resume: req.body.resume
    })
    .set('Content-Type', 'application/json')
    .end(function(err, response) {
      client.convertHtml(response.text, pdf.sendHttpResponse(res), {
        use_print_media: "true"
      });
    });
};
