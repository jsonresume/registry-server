var request = require('superagent');
var gravatar = require('gravatar');
var Mustache = require('mustache');
var templateHelper = require('../template-helper');



var renderHomePage = function(req, res) {
    req.db.collection('users').find({}).toArray(function(err, docs) {
        var usernameArray = [];
        docs.forEach(function(doc) {
            usernameArray.push({
                username: doc.username,
                gravatar: gravatar.url(doc.email, {
                    s: '80',
                    r: 'pg',
                    d: '404'
                })
            });
        });
        var page = Mustache.render(templateHelper.get('home'), {
            usernames: usernameArray
        });
        res.send(page);
    });

};

var renderResume = function(req, res) {
    console.log('hello')
    var themeName = req.query.theme || 'modern';
    var uid = req.params.uid;
    var format = req.params.format || req.headers.accept || 'html';
    req.db.collection('resumes').findOne({
        'jsonresume.username': uid,
    }, function(err, resume) {
        if (!resume) {
            var page = Mustache.render(templateHelper.get('noresume'), {});
            res.send(page);
            return;
        }
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
            delete resume.jsonresume; // This removes our registry server config vars from the resume.json
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
            resumeToMarkdown(resume, function(markdown, errs) {
                res.set({
                    'Content-Type': 'text/plain',
                    'Content-Length': markdown.length
                });
                res.send(markdown);
            })
        } else if (/pdf/.test(format)) {
            console.log('Come on PDFCROWD');
            resumeToHTML(resume, {
                theme: resume.jsonresume.theme || themeName
            }, function(content, errs) {
                client.convertHtml(content, pdf.sendHttpResponse(res));
            });
        } else {
            var theme = req.query.theme || resume.jsonresume.theme || themeName;
            request
                .post('http://themes.jsonresume.org/theme/' + theme)
                .send({
                    resume: resume
                })
                .set('Content-Type', 'application/json')
                .end(function(response) {
                    res.send(response.text);
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

var renderMembersPage = function(req, res) {
    console.log('================================');
    req.db.collection('users').find({}).toArray(function(err, docs) {
        console.log(err);
        var usernameArray = [];
        docs.forEach(function(doc) {
            usernameArray.push({
                username: doc.username,
                gravatar: gravatar.url(doc.email, {
                    s: '80',
                    r: 'pg',
                    d: '404'
                })
            });
        });
        var page = Mustache.render(templateHelper.get('members'), {
            usernames: usernameArray
        });
        res.send(page);
    });

};







var exportPdf = function(req, res) {
    console.log(req.body.resume, req.body.theme);
    request
        .post('http://themes.jsonresume.org/theme/' + req.body.theme)
        .send({
            resume: req.body.resume
        })
        .set('Content-Type', 'application/json')
        .end(function(response) {
            client.convertHtml(response.text, pdf.sendHttpResponse(res));
        });
}


module.exports = {
    session: require('./session'),
    resume: require('./resume'),
    user: request('./user'),

    renderHomePage: renderHomePage,
    renderResume: renderResume,
    renderMembersPage: renderMembersPage,
    exportPdf: exportPdf
}