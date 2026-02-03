/**
* This module is meant to handle event tracking
* @module api/parts/mgmt/tracker
*/

/** @lends module:api/parts/mgmt/tracker */
var tracker = {},
    stats = require('../data/stats.js'),
    common = require('../../utils/common.js'),
    logger = require('../../utils/log.js'),
    countlyFs = require('../../utils/countlyFs.js'),
    //log = logger("tracker:server"),
    Countly = require('countly-sdk-nodejs'),
    fs = require('fs'),
    path = require('path'),
    https = require('https'),
    http = require('http'),
    FormData = require('form-data'),
    { Readable } = require('node:stream'),
    versionInfo = require('../../../frontend/express/version.info'),
    server = "9c28c347849f2c03caf1b091ec7be8def435e85e",
    user = "fa6e9ae7b410cb6d756e8088c5f3936bf1fab5f3",
    url = "https://stats.count.ly",
    plugins = require('../../../plugins/pluginManager.ts');

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
        if (plugins.getConfig("white-labeling") && (plugins.getConfig("white-labeling").favicon || plugins.getConfig("white-labeling").stopleftlogo || plugins.getConfig("white-labeling").prelogo)) {
            var id = plugins.getConfig("white-labeling").favicon || plugins.getConfig("white-labeling").stopleftlogo || plugins.getConfig("white-labeling").prelogo;
            countlyFs.gridfs.getDataById("white-labeling", id, function(errWhitelabel, data) {
                if (!errWhitelabel && data) {
                    tracker.uploadBase64FileFromGridFS(data).catch(() => {});
                }
            });
        }
        else {
            Countly.user_details({"picture": "./images/favicon.png" });
        }
        if (plugins.getConfig("tracking").server_sessions) {
            Countly.begin_session(true);
        }
        if (plugins.getConfig("tracking").server_crashes) {
            Countly.track_errors();
        }
        setTimeout(function() {
            tracker.getAllData().then((custom) => {
                if (Object.keys(custom).length) {
                    Countly.user_details({"custom": custom });
                }
            });
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
* @returns {Promise<Object>} server stats
**/
tracker.collectServerStats = function() {
    var props = {};
    return new Promise((resolve) => {
        stats.getServer(common.db, function(data) {
            common.db.collection("apps").aggregate([{$project: {last_data: 1}}, {$sort: {"last_data": -1}}, {$limit: 1}], {allowDiskUse: true}, function(errApps, resApps) {
                common.db.collection("members").aggregate([{$project: {last_login: 1}}, {$sort: {"last_login": -1}}, {$limit: 1}], {allowDiskUse: true}, function(errLogin, resLogin) {
                    // Aggregate total list lengths across all documents in events collection
                    common.db.collection("events").aggregate([
                        {
                            $group: {
                                _id: null,
                                totalListLength: { $sum: { $size: "$list" } }
                            }
                        }
                    ], {allowDiskUse: true}, function(errEvents, resEvents) {

                        if (resApps && resApps[0]) {
                            props.last_data = resApps[0].last_data || 0;
                        }
                        if (resLogin && resLogin[0]) {
                            props.last_login = resLogin[0].last_login || 0;
                        }
                        if (resEvents && resEvents[0]) {
                            props.events = resEvents[0].totalListLength || 0;
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
                        resolve(props);
                    });
                });
            });
        });
    });
};

/**
* Get server data
* @returns {Object} server data
**/
tracker.collectServerData = async function() {
    var props = {};
    props.trial = versionInfo.trial ? true : false;
    props.plugins = plugins.getPlugins();
    props.nodejs = process.version;
    props.countly = versionInfo.version;
    props.docker = hasDockerEnv() || hasDockerCGroup() || hasDockerMountInfo();
    var edition = "Lite";
    if (IS_FLEX) {
        edition = "Flex";
    }
    else if (versionInfo.type !== "777a2bf527a18e0fffe22fb5b3e322e68d9c07a6") {
        edition = "Enterprise";
    }
    props.edition = edition;
    props.hosting = "self-hosted";
    if (props.edition === "Flex") {
        props.hosting = "flex";
    }
    else if (props.plugins.includes("tracker")) {
        props.hosting = "countly-hosted";
    }
    if (common.db.build && common.db.build.version) {
        props.mongodb = common.db.build.version;
    }
    const sdkData = await tracker.getSDKData();
    if (sdkData && sdkData.sdk_versions && Object.keys(sdkData.sdk_versions).length) {
        props.sdks = Object.keys(sdkData.sdk_versions);
        for (const [key, value] of Object.entries(sdkData.sdk_versions)) {
            props[key] = value;
        }
    }

    return props;
};

/**
 * Get all eligible data
 * @returns {Object} all eligible data
 */
tracker.getAllData = async function() {
    var props = {};
    if (plugins.getConfig("tracking").server_user_details) {
        Object.assign(props, await tracker.collectServerStats());
    }
    Object.assign(props, await tracker.collectServerData());
    return props;
};

/**
 * Query sdks collection for current and previous year (month 0) and combine meta_v2 data
 * @returns {Promise<Object>} Combined meta_v2 data from all matching documents
 */
tracker.getSDKData = async function() {
    var currentYear = new Date().getFullYear();
    var previousYear = currentYear - 1;

    // Build regex pattern to match: appid_YYYY:0_shard
    // Matches any app ID, year (current or previous), month 0, and any shard number
    var yearPattern = `(${currentYear}|${previousYear})`;
    var pattern = new RegExp(`^[a-f0-9]{24}_${yearPattern}:0_\\d+$`);

    try {
        // Use aggregation pipeline to combine meta_v2 data on MongoDB side
        var pipeline = [
            // Match documents for current and previous year, month 0, any shard
            {
                $match: {
                    _id: pattern
                }
            },
            // Project only meta_v2 field and convert to array of key-value pairs
            {
                $project: {
                    meta_v2: { $objectToArray: "$meta_v2" }
                }
            },
            // Unwind meta_v2 array to process each meta key separately
            {
                $unwind: "$meta_v2"
            },
            // Convert nested objects to arrays for merging
            {
                $project: {
                    metaKey: "$meta_v2.k",
                    metaValue: { $objectToArray: "$meta_v2.v" }
                }
            },
            // Unwind nested values
            {
                $unwind: "$metaValue"
            },
            // Group by meta key and inner key to collect all unique combinations
            {
                $group: {
                    _id: {
                        metaKey: "$metaKey",
                        innerKey: "$metaValue.k"
                    },
                    value: { $first: "$metaValue.v" }
                }
            },
            // Group by meta key to rebuild nested structure
            {
                $group: {
                    _id: "$_id.metaKey",
                    values: {
                        $push: {
                            k: "$_id.innerKey",
                            v: "$value"
                        }
                    }
                }
            },
            // Convert arrays back to objects
            {
                $project: {
                    _id: 0,
                    k: "$_id",
                    v: { $arrayToObject: "$values" }
                }
            },
            // Group all into single document
            {
                $group: {
                    _id: null,
                    meta_v2: {
                        $push: {
                            k: "$k",
                            v: "$v"
                        }
                    }
                }
            },
            // Convert final array to object
            {
                $project: {
                    _id: 0,
                    meta_v2: { $arrayToObject: "$meta_v2" }
                }
            }
        ];

        var result = await common.db.collection("sdks").aggregate(pipeline).toArray();

        // Extract combined meta_v2 or return empty object if no results
        var combinedMeta = (result && result[0] && result[0].meta_v2) ? result[0].meta_v2 : {};

        // Process sdk_version to extract highest version per SDK
        var sdkVersions = {};
        if (combinedMeta.sdk_version) {
            for (var versionKey in combinedMeta.sdk_version) {
                // Parse SDK version format: [sdk_name]_major:minor:patch
                var match = versionKey.match(/^\[([^\]]+)\]_(\d+):(\d+):(\d+)$/);
                if (match) {
                    var sdkName = match[1];
                    var major = parseInt(match[2], 10);
                    var minor = parseInt(match[3], 10);
                    var patch = parseInt(match[4], 10);

                    // Check if this SDK exists and compare versions
                    if (!sdkVersions[sdkName]) {
                        sdkVersions[sdkName] = {
                            version: `${major}.${minor}.${patch}`,
                            major: major,
                            minor: minor,
                            patch: patch
                        };
                    }
                    else {
                        var current = sdkVersions[sdkName];
                        // Compare versions (major.minor.patch)
                        if (major > current.major ||
                            (major === current.major && minor > current.minor) ||
                            (major === current.major && minor === current.minor && patch > current.patch)) {
                            sdkVersions[sdkName] = {
                                version: `${major}.${minor}.${patch}`,
                                major: major,
                                minor: minor,
                                patch: patch
                            };
                        }
                    }
                }
            }
        }

        // Convert to simple object with just SDK name -> version string
        var simpleSdkVersions = {};
        for (var sdk in sdkVersions) {
            simpleSdkVersions[`sdk_${sdk}`] = sdkVersions[sdk].version;
        }

        return {
            meta_v2: combinedMeta,
            sdk_versions: simpleSdkVersions,
            years: [previousYear, currentYear],
            month: 0
        };
    }
    catch (error) {
        logger("tracker:server").error("Error querying SDK data:", error);
        return {
            meta_v2: {},
            error: error.message
        };
    }
};

/**
 * Upload a base64-encoded file from GridFS to the stats server
 * This function handles files stored in GridFS as base64 strings (e.g., data URIs)
 * and decodes them before uploading
 * 
 * @param {Object} base64String - Picture data
 * @returns {Promise<Object>} Upload result
 */
tracker.uploadBase64FileFromGridFS = function(base64String) {
    return new Promise((resolve, reject) => {
        var domain = stripTrailingSlash((plugins.getConfig("api").domain + "").split("://").pop());
        if (domain && domain !== "localhost") {
            try {
                let mimeType = "image/png";
                // Strip data URI prefix if present and stripDataURI is true
                if (base64String.includes('base64,')) {
                    // Extract MIME type from data URI if not provided
                    const dataURIMatch = base64String.match(/^data:([^;]+);base64,/);
                    if (dataURIMatch) {
                        mimeType = dataURIMatch[1];
                    }
                    // Remove data URI prefix
                    base64String = base64String.split('base64,')[1];
                }

                // Decode base64 to binary buffer
                const binaryBuffer = Buffer.from(base64String, 'base64');

                // Create a readable stream from the decoded buffer
                const decodedStream = Readable.from(binaryBuffer);

                // Parse the URL
                const statsUrl = new URL(url);
                const protocol = statsUrl.protocol === 'https:' ? https : http;

                // Build query parameters
                const queryParams = new URLSearchParams({
                    device_id: domain,
                    app_key: server,
                    user_details: ""
                });

                // Create form data
                const form = new FormData();

                // Prepare form options with MIME type if available
                const formOptions = { filename: "profile" };
                if (mimeType) {
                    formOptions.contentType = mimeType;
                }

                form.append('file', decodedStream, formOptions);

                // Prepare request options
                const requestOptions = {
                    hostname: statsUrl.hostname,
                    port: statsUrl.port || (statsUrl.protocol === 'https:' ? 443 : 80),
                    path: `/i?${queryParams.toString()}`,
                    method: 'POST',
                    headers: form.getHeaders()
                };

                // Make the request
                const req = protocol.request(requestOptions, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            try {
                                const result = JSON.parse(data);
                                resolve({
                                    success: true,
                                    statusCode: res.statusCode,
                                    data: result
                                });
                            }
                            catch (e) {
                                resolve({
                                    success: true,
                                    statusCode: res.statusCode,
                                    data: data
                                });
                            }
                        }
                        else {
                            reject(new Error(`Upload failed with status ${res.statusCode}: ${data}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(error);
                });

                // Pipe the form data to the request
                form.pipe(req);
            }
            catch (error) {
                reject(error);
            }
        }
    });
};

/**
 * Check if running in Docker environment
 * @returns {boolean} if running in docker
 */
function hasDockerEnv() {
    try {
        fs.statSync('/.dockerenv');
        return true;
    }
    catch {
        return false;
    }
}

/** 
 * Check if running in Docker by inspecting cgroup info
 * @returns {boolean} if running in docker
 */
function hasDockerCGroup() {
    try {
        return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
    }
    catch {
        return false;
    }
}

/** 
 * Check if running in Docker by inspecting mountinfo
 * @returns {boolean} if running in docker
 */
function hasDockerMountInfo() {
    try {
        return fs.readFileSync('/proc/self/mountinfo', 'utf8').includes('/docker/containers/');
    }
    catch {
        return false;
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

module.exports = tracker;