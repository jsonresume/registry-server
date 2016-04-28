module.exports = function allowCrossDomain(req, res, next) {
  // Added other domains you want the server to give access to
  // WARNING - Be careful with what origins you give access to
  var allowedHost = [
    'https://backbonetutorials.com',
    'https://localhost'
  ];

  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  next();
  
};
