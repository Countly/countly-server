var pluginManager = require('../../../plugins/pluginManager.js');
var request = require('countly-request')(null, null, null, pluginManager.getConfig("security"));
var countlyConfig = require("../../../frontend/express/config.js");
var myArgs = process.argv.slice(2);

function output(err, body, pretty) {
    if (err) {
        console.log("Error", err);
    }
    else {
        if (pretty) {
            console.log(JSON.stringify(JSON.parse(body), null, 2));
        }
        else {
            console.log(body);
        }
    }

}

if (myArgs[0] == "pretty") {
    request({strictSSL: false, uri: (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + (countlyConfig.path || "") + myArgs[1]}, function(error, response, body) {
        output(error, body, true);
    });
}
else {
    request({strictSSL: false, uri: (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + (countlyConfig.path || "") + myArgs[0]}, function(error, response, body) {
        output(error, body);
    });
}