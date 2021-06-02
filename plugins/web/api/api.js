var pluginOb = {},
    parser = require('ua-parser-js'),
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    { validateRead } = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'web';

(function() {
    plugins.appTypes.push("web");

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.register("/sdk", function(ob) {
        var params = ob.params;

        var agent = parser((params.qstring.metrics && params.qstring.metrics._ua) ? params.qstring.metrics._ua : params.req.headers['user-agent']);
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

        if (agent.browser.name === "Edge") {
            if (agent.engine.name === "WebKit") {
                agent.browser.name = "Edge Chromium";
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
                if (typeof agent.device.model !== "undefined") {
                    params.qstring.metrics._device = agent.device.model;
                }
                else {
                    params.qstring.metrics._device = (agent.device.vendor === "Other") ? "Unknown" : agent.device.vendor;
                }
            }

            if (!params.qstring.metrics._device_type) {
                params.qstring.metrics._device_type = agent.device.type;

                //if still undefined and app is web then it must be desktop
                if (!params.qstring.metrics._device_type && params.app.type === "web") {
                    params.qstring.metrics._device_type = "desktop";
                }
            }
        }

        //check if view events need to have platform segment
        if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
            params.qstring.events = params.qstring.events.map(function(currEvent) {
                if (currEvent.key === "[CLY]_view" && currEvent.segmentation && currEvent.segmentation.name && (!currEvent.segmentation.segment && !currEvent.segmentation.platform)) {
                    currEvent.segmentation.segment = data.os;
                }
                else if ((currEvent.key === "[CLY]_star_rating" || currEvent.key === "[CLY]_nps" || currEvent.key === "[CLY]_survey") && currEvent.segmentation && !currEvent.segmentation.platform) {
                    currEvent.segmentation.platform = data.os;
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
                if (typeof agent.device.model !== "undefined") {
                    params.qstring.crash._device = agent.device.model;
                }
                else {
                    params.qstring.crash._device = (agent.device.vendor === "Other") ? "Unknown" : agent.device.vendor;
                }
            }
        }
    });

    plugins.register("/o", function(ob) {
        var params = ob.params;
        if (params.qstring.method === "latest_users") {
            validateRead(params, FEATURE_NAME, function() {
                common.db.collection("app_users" + params.app_id).find({}, {projection: {uid: 1, cc: 1, cty: 1, p: 1, brw: 1, lv: 1, src: 1, sc: 1, lac: 1, tsd: 1}}).sort({lac: -1}).limit(50).toArray(function(err, users) {
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
