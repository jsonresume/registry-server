 var updateTheme = function(req, res) {

     var password = req.body.password;
     var email = req.body.email;
     var theme = req.body.theme;
     console.log(theme, "theme update!!!!!!!!!!!!1111");
     // console.log(req.body);
     db.collection('users').findOne({
         'email': email
     }, function(err, user) {
         if (user && bcrypt.compareSync(password, user.hash)) {

             db.collection('resumes').update({
                 //query
                 'jsonresume.username': user.username
             }, {
                 // update set new theme
                 $set: {
                     'jsonresume.theme': theme
                 }
             }, {
                 //options
                 upsert: true,
                 safe: true
             }, function(err, resume) {
                 res.send({
                     url: 'http://registry.jsonresume.org/' + user.username
                 });
             });
         } else {
             console.log('deleted');
             res.send({
                 message: 'authentication error'
             });
         }
     });

 }

 module.exports = updateTheme;