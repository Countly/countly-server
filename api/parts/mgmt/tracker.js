/**
* This module is meant to handle event tracking
* @module api/parts/mgmt/tracker
*/

/** @lends module:api/parts/mgmt/tracker */
var tracker = {},
    stats = require('../data/stats.js'),
    common = require('../../utils/common.js'),
    logger = require('../../utils/log.js'),
    //log = logger("tracker:server"),
    Countly = require('countly-sdk-nodejs'),
    fs = require('fs'),
    path = require('path'),
    versionInfo = require('../../../frontend/express/version.info'),
    server = "9c28c347849f2c03caf1b091ec7be8def435e85e",
    user = "fa6e9ae7b410cb6d756e8088c5f3936bf1fab5f3",
    url = "https://stats.count.ly",
    plugins = require('../../../plugins/pluginManager.js');

var IS_FLEX = false;

if (fs.existsSync(path.resolve('/opt/deployment_env.json'))) {
    var deploymentConf = fs.readFileSync('/opt/deployment_env.json', 'utf8');
    try {
        if (JSON.parse(deploymentConf).DEPLOYMENT_ID) {
            IS_FLEX = true;
        }
    }
    catch (e) {
        IS_FLEX = false;
    }
}

//update configs
var isEnabled = false;

/**
* Enable tracking for this server
**/
tracker.enable = function() {
    if (isEnabled) {
        return;
    }

    var config = {
        app_key: server,
        url: url,
        app_version: versionInfo.version,
        storage_path: "../../../.sdk/",
        interval: 10000,
        fail_timeout: 600,
        session_update: 60 * 60 * 12,
        remote_config: true,
        debug: (logger.getLevel("tracker:server") === "debug")
    };

    var domain = plugins.getConfig("api").domain;

    //set static device id if domain is defined
    if (domain) {
        config.device_id = stripTrailingSlash((domain + "").split("://").pop());
    }

    if (config.device_id && config.device_id !== "localhost") {
        Countly.init(config);

        //change device id if is it not domain
        if (Countly.get_device_id() !== domain) {
            Countly.change_id(stripTrailingSlash((domain + "").split("://").pop()), true);
        }

        isEnabled = true;
        Countly.user_details({"name": config.device_id });
        if (plugins.getConfig("tracking").server_sessions) {
            Countly.begin_session(true);
        }
        if (plugins.getConfig("tracking").server_crashes) {
            Countly.track_errors();
        }
        setTimeout(function() {
            var custom = tracker.getAllData();
            if (Object.keys(custom).length) {
                Countly.user_details({"custom": custom });
            }
        }, 20000);
    }
};

/**
 * Get bulk server instance
 * @returns {Object} Countly Bulk instance
 */
tracker.getBulkServer = function() {
    return new Countly.Bulk({
        app_key: server,
        url: url
    });
};

/**
 * Get bulk user instance
 * @param {Object} serverInstance - Countly Bulk server instance
 * @returns {Object} Countly Bulk User instance
 */
tracker.getBulkUser = function(serverInstance) {
    var domain = stripTrailingSlash((plugins.getConfig("api").domain + "").split("://").pop());
    if (domain && domain !== "localhost") {
        return serverInstance.add_user({device_id: domain});
    }
};

/**
* Report server level event
* @param {object} event - event object
**/
tracker.reportEvent = function(event) {
    if (isEnabled && plugins.getConfig("tracking").server_events) {
        Countly.add_event(event);
    }
};

/**
* Report server level event in bulk
* @param {Array} events - array of event objects
**/
tracker.reportEventBulk = function(events) {
    if (isEnabled && plugins.getConfig("tracking").server_events) {
        Countly.request({
            app_key: server,
            device_id: Countly.get_device_id(),
            events: JSON.stringify(events)
        });
    }
};

/**
* Report user level event
* @param {string} id - id of the device
* @param {object} event - event object
**/
tracker.reportUserEvent = function(id, event) {
    if (isEnabled && plugins.getConfig("tracking").user_events) {
        Countly.request({
            app_key: user,
            device_id: id,
            events: JSON.stringify([event])
        });
    }
};

/**
* Check if tracking enabled
* @returns {boolean} if enabled
**/
tracker.isEnabled = function() {
    return isEnabled;
};

/**
* Get SDK instance
* @returns {Object} Countly NodeJS SDK instance
**/
tracker.getSDK = function() {
    return Countly;
};

/**
* Get server stats
**/
tracker.collectServerStats = function() {
    var props = {};
    stats.getServer(common.db, function(data) {
        common.db.collection("apps").aggregate([{$project: {last_data: 1}}, {$sort: {"last_data": -1}}, {$limit: 1}], {allowDiskUse: true}, function(errApps, resApps) {
            common.db.collection("members").aggregate([{$project: {last_login: 1}}, {$sort: {"last_login": -1}}, {$limit: 1}], {allowDiskUse: true}, function(errLogin, resLogin) {
                if (resApps && resApps[0]) {
                    props.last_data = resApps[0].last_data || 0;
                }
                if (resLogin && resLogin[0]) {
                    props.last_login = resLogin[0].last_login || 0;
                }
                if (data) {
                    if (data.app_users) {
                        props.app_users = data.app_users;
                    }
                    if (data.apps) {
                        props.apps = data.apps;
                    }
                    if (data.users) {
                        props.users = data.users;
                    }
                }
                return props;
            });
        });
    });
};

/**
* Get server data
* @returns {Object} server data
**/
tracker.collectServerData = function() {
    var props = {};
    props.trial = versionInfo.trial ? true : false;
    props.plugins = plugins.getPlugins();
    props.nodejs = process.version;
    props.countly = versionInfo.version;
    var edition = "Lite";
    if (IS_FLEX) {
        edition = "Flex";
    }
    else if (versionInfo.type !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
        edition = "Enterprise";
    }
    props.edition = edition;
    if (common.db.build && common.db.build.version) {
        props.mongodb = common.db.build.version;
    }
    return props;
};

/**
 * Get all eligible data
 * @returns {Object} all eligible data
 */
tracker.getAllData = function() {
    var props = {};
    if (plugins.getConfig("tracking").server_user_details) {
        Object.assign(props, tracker.collectServerStats());
    }
    Object.assign(props, tracker.collectServerData());
    return props;
};

/**
* Strip traling slashes from url
* @param {string} str - url to strip
* @returns {string} stripped url
**/
function stripTrailingSlash(str) {
    if (str.substr(str.length - 1) === "/") {
        return str.substr(0, str.length - 1);
    }
    return str;
}

module.exports = tracker;