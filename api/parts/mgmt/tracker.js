/**
* This module is meant to handle event tracking
* @module api/parts/mgmt/tracker
*/

/** @lends module:api/parts/mgmt/tracker */
var tracker = {},
    stats = require('../data/stats.js'),
    common = require('../../utils/common.js'),
    logger = require('../../utils/log.js'),
    log = logger("tracker:server"),
    Countly = require('countly-sdk-nodejs'),
    countlyConfig = require("../../../frontend/express/config.js"),
    versionInfo = require('../../../frontend/express/version.info'),
    request = require('request'),
    cluster = require('cluster'),
    server = "e0693b48a5513cb60c112c21aede3cab809d52d0",
    app = "386012020c7bf7fcb2f1edf215f1801d6146913f",
    host = "https://stats.count.ly";


//update configs    
request("http://localhost/configs", function(err, res, body) {
    log.d(err, body);
});
var countlyConfigOrig = JSON.parse(JSON.stringify(countlyConfig));
var url = "https://count.ly/configurations/ce/tracking";
if (versionInfo.type !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
    url = "https://count.ly/configurations/ee/tracking";
}

request(url, function(err, response, body) {
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        }
        catch (ex) {
            body = null;
        }
    }
    if (body) {
        if (countlyConfigOrig.web.use_intercom && typeof body.intercom !== "undefined") {
            countlyConfig.web.use_intercom = body.intercom;
        }
        if (typeof countlyConfigOrig.web.track === "undefined" && typeof body.stats !== "undefined") {
            if (body.stats) {
                countlyConfig.web.track = null;
            }
            else {
                countlyConfig.web.track = "none";
            }
        }
        if (typeof countlyConfigOrig.web.server_track === "undefined" && typeof body.server !== "undefined") {
            if (body.server) {
                countlyConfig.web.server_track = null;
            }
            else {
                countlyConfig.web.server_track = "none";
            }
        }
    }

    if (countlyConfig.web.track !== "none" && countlyConfig.web.server_track !== "none") {
        if (cluster.isMaster) {
            Countly.begin_session(true);
            collectServerData();
        }
    }
});

Countly.init({
    app_key: server,
    url: host,
    app_version: versionInfo.version,
    storage_path: "../../../.sdk/",
    interval: 60000,
    fail_timeout: 600,
    session_update: 120,
    debug: (logger.getLevel("tracker:server") === "debug")
});

if (countlyConfig.web.track !== "none" && countlyConfig.web.server_track !== "none") {
    Countly.track_errors();
}


/**
* Report server level event
* @param {object} event - event object
**/
tracker.reportEvent = function(event) {
    if (countlyConfig.web.track !== "none" && countlyConfig.web.server_track !== "none") {
        Countly.add_event(event);
    }
};

/**
* Report user level event
* @param {string} id - id of the device
* @param {object} event - event object
* @param {string} level - tracking level
**/
tracker.reportUserEvent = function(id, event, level) {
    if (countlyConfig.web.track !== "none" && (!level || countlyConfig.web.track === level) && countlyConfig.web.server_track !== "none") {
        Countly.request({
            app_key: app,
            devide_id: id,
            events: JSON.stringify([event])
        });
    }
};

/**
* Get server stats
**/
function collectServerData() {
    stats.getServer(common.db, function(data) {
        console.log("GOT DATA", data);
        Countly.userData.set("cores", require('os').cpus().length);
        if (data) {
            if (data.app_users) {
                Countly.userData.set("app_users", data.app_users);
            }
            if (data.apps) {
                Countly.userData.set("apps", data.apps);
            }
            if (data.users) {
                Countly.userData.set("users", data.users);
            }
        }
        Countly.userData.save();
    });
}

module.exports = tracker;