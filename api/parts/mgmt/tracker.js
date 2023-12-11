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
    countlyConfig = require("../../../frontend/express/config.js"),
    versionInfo = require('../../../frontend/express/version.info'),
    ip = require('./ip.js'),
    request = require('countly-request'),
    cluster = require('cluster'),
    os = require('os'),
    fs = require('fs'),
    asyncjs = require('async'),
    trial = "79199134e635edb05fc137e8cd202bb8640fb0eb",
    app = "e70ec21cbe19e799472dfaee0adb9223516d238f",
    server = app,
    url = "https://stats.count.ly",
    plugins = require('../../../plugins/pluginManager.js'),
    offlineMode = plugins.getConfig("api").offline_mode,
    domain = plugins.getConfig("api").domain;


//update configs
var cache = {};
if (countlyConfig.web && countlyConfig.web.track === "all") {
    countlyConfig.web.track = null;
}
var countlyConfigOrig = JSON.parse(JSON.stringify(countlyConfig));
var url_check = "https://count.ly/configurations/ce/tracking";
if (versionInfo.type !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
    url_check = "https://count.ly/configurations/ee/tracking";
}

if (!offlineMode) {
    request(url_check, function(err, response, body) {
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
    });
}

var isEnabled = false;

/**
* Enable tracking for this server
**/
tracker.enable = function() {
    var config = {
        app_key: (versionInfo.trial) ? trial : server,
        url: url,
        app_version: versionInfo.version,
        storage_path: "../../../.sdk/",
        interval: 10000,
        fail_timeout: 600,
        session_update: 120,
        remote_config: true,
        debug: (logger.getLevel("tracker:server") === "debug")
    };
    //set static device id if domain is defined
    if (domain) {
        config.device_id = stripTrailingSlash((domain + "").split("://").pop());
    }
    Countly.init(config);

    //change device id if is it not domain
    if (domain && Countly.get_device_id() !== domain) {
        Countly.change_id(stripTrailingSlash((domain + "").split("://").pop()), true);
    }
    else if (!domain) {
        checkDomain();
    }

    isEnabled = true;
    if (countlyConfig.web.track !== "none" && countlyConfig.web.server_track !== "none") {
        Countly.track_errors();
    }
    if (cluster.isMaster) {
        setTimeout(function() {
            if (countlyConfig.web.track !== "none" && countlyConfig.web.server_track !== "none") {
                Countly.begin_session(true);
                setTimeout(function() {
                    collectServerStats();
                    collectServerData();
                }, 20000);
            }
        }, 1000);
        //report app start trace
        if (Countly.report_app_start) {
            Countly.report_app_start();
        }
    }
};

/**
* Enable tracking for dashboard process
**/
tracker.enableDashboard = function() {
    var config = {
        app_key: (versionInfo.trial) ? trial : server,
        url: url,
        app_version: versionInfo.version,
        storage_path: "../../../.sdk/",
        interval: 60000,
        fail_timeout: 600,
        session_update: 120,
        debug: (logger.getLevel("tracker:server") === "debug")
    };
    //set static device id if domain is defined
    if (domain) {
        config.device_id = stripTrailingSlash((domain + "").split("://").pop());
    }
    Countly.init(config);

    //change device id if is it not domain
    if (domain && Countly.get_device_id() !== domain) {
        Countly.change_id(stripTrailingSlash((domain + "").split("://").pop()), true);
    }
    else if (!domain) {
        checkDomain();
    }
    isEnabled = true;
    if (countlyConfig.web.track !== "none" && countlyConfig.web.server_track !== "none") {
        Countly.track_errors();
    }
};


/**
* Report server level event
* @param {object} event - event object
**/
tracker.reportEvent = function(event) {
    if (isEnabled && countlyConfig.web.track !== "none" && countlyConfig.web.server_track !== "none") {
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
    if (isEnabled && countlyConfig.web.track !== "none" && (!level || countlyConfig.web.track === level) && countlyConfig.web.server_track !== "none") {
        Countly.request({
            app_key: app,
            device_id: id,
            events: JSON.stringify([event])
        });
    }
};

/**
* Check if tracking enabled
* @param {boolean|string} level - level of tracking
* @returns {boolean} if enabled
**/
tracker.isEnabled = function(level) {
    return (isEnabled && countlyConfig.web.track !== "none" && (!level || countlyConfig.web.track === level) && countlyConfig.web.server_track !== "none");
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
function collectServerStats() { // eslint-disable-line no-unused-vars
    stats.getServer(common.db, function(data) {
        common.db.collection("apps").aggregate([{$project: {last_data: 1}}, {$sort: {"last_data": -1}}, {$limit: 1}], {allowDiskUse: true}, function(errApps, resApps) {
            common.db.collection("members").aggregate([{$project: {last_login: 1}}, {$sort: {"last_login": -1}}, {$limit: 1}], {allowDiskUse: true}, function(errLogin, resLogin) {
                if (resApps && resApps[0]) {
                    Countly.userData.set("last_data", resApps[0].last_data || 0);
                }
                if (resLogin && resLogin[0]) {
                    Countly.userData.set("last_login", resLogin[0].last_login || 0);
                }
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
        });
    });
}

/**
* Get server data
**/
function collectServerData() {
    Countly.userData.set("plugins", plugins.getPlugins());
    var cpus = os.cpus();
    if (cpus && cpus.length) {
        Countly.userData.set("cores", cpus.length);
    }
    Countly.userData.set("nodejs_version", process.version);
    if (common.db.build && common.db.build.version) {
        Countly.userData.set("db_version", common.db.build.version);
    }
    common.db.command({ serverStatus: 1 }, function(errCmd, res) {
        if (res && res.storageEngine && res.storageEngine.name) {
            Countly.userData.set("db_engine", res.storageEngine.name);
        }
        getDomain(function(err, domainname) {
            if (!err) {
                Countly.userData.set("domain", domainname);
                Countly.user_details({"name": stripTrailingSlash((domainname + "").split("://").pop())});
            }
            getDistro(function(err2, distro) {
                if (!err2) {
                    Countly.userData.set("distro", distro);
                }
                getHosting(function(err3, hosting) {
                    if (!err3) {
                        Countly.userData.set("hosting", hosting);
                    }
                    Countly.userData.save();
                });
            });
        });
    });
}

/**
* Get server domain or ip
* @param {function} callback - callback to get results
**/
function getDomain(callback) {
    if (cache.domain) {
        callback(false, cache.domain);
    }
    else {
        ip.getHost(function(err, host) {
            cache.domain = host;
            callback(err, host);
        });
    }
}

/**
* Get server hosting provider
* @param {function} callback - callback to get results
**/
function getHosting(callback) {
    if (cache.hosting) {
        callback(cache.hosting.length === 0, cache.hosting);
    }
    else {
        var hostings = {
            "Digital Ocean": "http://169.254.169.254/metadata/v1/hostname",
            "Google Cloud": "http://metadata.google.internal",
            "AWS": "http://169.254.169.254/latest/dynamic/instance-identity/"
        };
        asyncjs.eachSeries(Object.keys(hostings), function(host, done) {
            request(hostings[host], function(err, response) {
                if (response && response.statusCode >= 200 && response.statusCode < 300) {
                    cache.hosting = host;
                    callback(false, cache.hosting);
                    done(true);
                }
                else {
                    done();
                }
            });
        }, function() {
            if (!cache.hosting) {
                callback(true, cache.hosting);
            }
        });
    }
}

/**
* Get OS distro
* @param {function} callback - callback to get results
**/
function getDistro(callback) {
    if (cache.distro) {
        callback(cache.distro.length === 0, cache.distro);
    }
    else {
        var oses = {"win32": "Windows", "darwin": "macOS"};
        var osName = os.platform();
        // Linux is a special case.
        if (osName !== 'linux') {
            cache.distro = oses[osName] ? oses[osName] : osName;
            cache.distro += " " + os.release();
            callback(false, cache.distro);
        }
        else {
            var distros = {
                "/etc/lsb-release": {name: "Ubuntu", regex: /distrib_release=(.*)/i},
                "/etc/redhat-release": {name: "RHEL/Centos", regex: /release ([^ ]+)/i}
            };
            asyncjs.eachSeries(Object.keys(distros), function(distro, done) {
                //check ubuntu
                fs.readFile(distro, 'utf8', (err, data) => {
                    if (!err && data) {
                        cache.distro = distros[distro].name;
                        var match = data.match(distros[distro].regex);
                        if (match[1]) {
                            cache.distro += " " + match[1];
                        }
                        callback(false, cache.distro);
                        done(true);
                    }
                    else {
                        done(null);
                    }
                });
            }, function() {
                if (!cache.distro) {
                    callback(true, cache.distro);
                }
            });
        }
    }
}

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

//check every hour if domain was provided
var checkDomain = function() {
    if (!domain && domain !== plugins.getConfig("api").domain) {
        domain = plugins.getConfig("api").domain;
        if (Countly && isEnabled) {
            Countly.change_id(stripTrailingSlash((domain + "").split("://").pop()), true);
            Countly.userData.set("domain", domain);
            Countly.user_details({"name": stripTrailingSlash((domain + "").split("://").pop())});
            Countly.userData.save();
        }
    }
    else if (!domain) {
        setTimeout(checkDomain, 3600000);
    }
};

module.exports = tracker;