if (process.env.REDISTOGO_URL) {
    var rtg = require("url").parse(process.env.REDISTOGO_URL);
    var redis = require("redis").createClient(rtg.port, rtg.hostname);
    redis.auth(rtg.auth.split(":")[1]);
} else {
    var redis = require("redis").createClient();
}

redis.on("error", function(err) {
    console.log("error event - " + redis.host + ":" + redis.port + " - " + err);
    res.send({
        sessionError: err
    });
});

module.exports = redis;
