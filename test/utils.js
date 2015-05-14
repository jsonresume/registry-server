
var cleanUsername = function(s) {
    // remove spaces and slashes to make nice URLs
    return s.replace(/ /g, "_").replace("/", "");
};

var getTestName = function(test) {
    return cleanUsername(test.fullTitle());
};

module.exports = function(api) {
    return {
        getUserForTest: function(test) {
            var testName = getTestName(test);
            return {
                    username: testName,
                    email: testName+"@example.com",
                    password: "password"
                };
        },
        createUser: function(user) {
            return api.post('/user')
                .send(user)
                .then(function(res) {
                    return res.body;
                });
        },
        getSessionFor: function(user) {
            return api.post('/session')
                .send(user)
                .then(function(res) {
                    return res.body.session;
                });
        }
    };
};
