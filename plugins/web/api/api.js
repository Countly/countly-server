var pluginOb = {},
    parser = require('ua-parser-js'),
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function() {
    plugins.appTypes.push("web");
    plugins.register("/sdk", function(ob) {
        var params = ob.params;
        if (params.qstring.sdk_version && (!params.app.sdk_version || common.versionCompare(params.qstring.sdk_version, params.app.sdk_version, {delimiter: "."}) === 1)) {
            common.db.collection("apps").update({_id: params.app._id}, {$set: {sdk_version: params.qstring.sdk_version}});
        }

        var agent = parser(params.req.headers['user-agent'], (params.qstring.metrics) ? params.qstring.metrics._ua : undefined);
        var data = { os: agent.os.name, os_version: agent.os.version };

        if (data.os === "Mac OS") {
            data.os = "Mac";
        }
        else if (data.os === "iOS" || data.os === "Android") {
            if (agent.browser.name === "Firefox") {
                agent.browser.name = "Firefox Mobile";
            }
            else if (agent.browser.name === "Chrome") {
                agent.browser.name = "Chrome Mobile";
            }
            else if (agent.browser.name === "Edge") {
                agent.browser.name = "Edge Mobile";
            }
        }

        if (params.qstring.begin_session) {
            //try to add metrics based on user agent
            if (!params.qstring.metrics) {
                params.qstring.metrics = {};
            }

            //if some metrics are not provided, parse them from user agent                
            if (!params.qstring.metrics._browser) {
                params.qstring.metrics._browser = agent.browser.name;
            }

            if (!params.qstring.metrics._browser_version) {
                params.qstring.metrics._browser_version = agent.browser.version;
            }

            if (params.qstring.metrics._browser && params.qstring.metrics._browser_version && !params.qstring.metrics._browser_version.startsWith("[" + params.qstring.metrics._browser.toLowerCase() + "]_")) {
                params.qstring.metrics._browser_version = "[" + params.qstring.metrics._browser.toLowerCase() + "]_" + params.qstring.metrics._browser_version;
            }

            if (!params.qstring.metrics._os) {
                params.qstring.metrics._os = data.os;
            }

            if (!params.qstring.metrics._os_version) {
                params.qstring.metrics._os_version = data.os_version;
            }

            if (!params.qstring.metrics._device) {
                params.qstring.metrics._device = (agent.device.vendor === "Other") ? "Unknown" : agent.device.vendor;
            }
        }

        //check if view events need to have platform segment
        if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
            params.qstring.events = params.qstring.events.map(function(currEvent) {
                if (currEvent.key === "[CLY]_view" && currEvent.segmentation && currEvent.segmentation.name && !currEvent.segmentation.segment) {
                    currEvent.segmentation.segment = data.os;
                }
                return currEvent;
            });
        }

        //check of any crash segments can be updated
        if (typeof params.qstring.crash === "string") {
            try {
                params.qstring.crash = JSON.parse(params.qstring.crash);
            }
            catch (SyntaxError) {
                console.log('Parse crash JSON failed');
                return false;
            }
            if (!params.qstring.crash._os) {
                params.qstring.crash._os = data.os;
            }

            if (!params.qstring.crash._os_version) {
                params.qstring.crash._os_version = data.os + " " + data.os_version;
            }

            if (!params.qstring.crash._browser) {
                params.qstring.crash._browser = agent.browser.name;
            }

            if (!params.qstring.crash._device) {
                params.qstring.crash._device = (agent.device.vendor === "Other") ? "Unknown" : agent.device.vendor;
            }
        }
    });

    plugins.register("/o", function(ob) {
        var params = ob.params;
        var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
        if (params.qstring.method === "latest_users") {
            validateUserForDataReadAPI(params, function() {
                common.db.collection("app_users" + params.app_id).find({}).sort({ls: -1}).limit(50).toArray(function(err, users) {
                    if (!err) {
                        common.returnOutput(params, users);
                    }
                    else {
                        common.returnMessage(params, 400, 'Error occured');
                    }
                });
            });
            return true;
        }
        return false;
    });
}(pluginOb));

module.exports = pluginOb;