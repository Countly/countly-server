import countlyGlobal from "./countly.global.js";
import jQuery from "jquery";
import { countlyCommon } from './countly.common.js';

// Private Properties
let _activeAppId = 0;
let _initialized = {};
let _period = null;
let _totalUserObjects = {};

/**
 * Sets init status for forMetric in below format
 * { "APP_KEY": { "countries": { "60days": true } } }
 * We don't directly use _totalUserObjects for init check because it is init after AJAX and might take time
 * @param {string} forMetric - metric for which set init status
 */
function setInit(forMetric) {
    if (!_initialized[_activeAppId]) {
        _initialized[_activeAppId] = {};
    }

    if (!_initialized[_activeAppId][forMetric]) {
        _initialized[_activeAppId][forMetric] = {};
    }

    _initialized[_activeAppId][forMetric][_period] = true;
}

/**
 * Checks if metric is initialized
 * @param {string} forMetric - metric name to check
 * @returns {boolean} if initialized
 */
function isInitialized(forMetric) {
    return _initialized[_activeAppId] &&
            _initialized[_activeAppId][forMetric] &&
            _initialized[_activeAppId][forMetric][_period];
}

/**
 * Response from the API is in [{"_id":"TR","u":1},{"_id":"UK","u":5}] format
 * We convert it to {"TR": 1, "UK": 5} format in this function
 * processingFunction is used for cases where keys are converted before being processed (e.g. device names)
 * @param {object} obj - data object
 * @param {string} forMetric - metric name
 * @param {boolean} prev - get data for previous period
 * @returns {object} converted object
 */
function formatCalculatedObj(obj, forMetric, prev) {
    var tmpObj = {},
        processingFunction;

    // no need to format current metrics, as we are matching them in unformated way
    /*switch (forMetric) {
    case "devices":
        processingFunction = countlyDevice.getDeviceFullName;
        break;
    }*/

    for (var i = 0; i < obj.length; i++) {
        var tmpKey = (processingFunction) ? processingFunction(obj[i]._id) : obj[i]._id;

        if (prev) {
            tmpObj[tmpKey] = obj[i].pu || 0;
        }
        else {
            tmpObj[tmpKey] = obj[i].u || 0;
        }
    }

    return tmpObj;
}

/**
 * Adds data for forMetric to _totalUserObjects object in below format
 * { "APP_ID": { "countries": { "60days": {"TR": 1, "UK": 5} } } }
 * @param {string} forMetric - metric name
 * @param {object} data - data to set
 */
function setCalculatedObj(forMetric, data) {
    if (!_totalUserObjects[_activeAppId]) {
        _totalUserObjects[_activeAppId] = {};
    }

    if (!_totalUserObjects[_activeAppId][forMetric]) {
        _totalUserObjects[_activeAppId][forMetric] = {};
    }

    _totalUserObjects[_activeAppId][forMetric][_period] = formatCalculatedObj(data, forMetric);
    _totalUserObjects[_activeAppId][forMetric]["prev_" + _period] = formatCalculatedObj(data, forMetric, true);
}

/**
 * Sets refresh obj for metric
 * { "APP_KEY": { "countries": { "60days": {"TR": 1, "UK": 5} } } }
 * @param {string} forMetric - metric name
 * @param {object} data - data to set
 */
function setRefreshObj(forMetric, data) {
    if (!_totalUserObjects[_activeAppId]) {
        _totalUserObjects[_activeAppId] = {};
    }

    if (!_totalUserObjects[_activeAppId][forMetric]) {
        _totalUserObjects[_activeAppId][forMetric] = {};
    }

    _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"] = formatCalculatedObj(data, forMetric);
}

/**
 * Refreshes data based the diff between current "refresh" and the new one retrieved from the API
 * { "APP_KEY": { "countries": { "30days_refresh": {"TR": 1, "UK": 5} } } }
 * @param {string} forMetric - metric name
 * @param {object} todaysJson - data
 */
function refreshData(forMetric, todaysJson) {
    if (_totalUserObjects[_activeAppId] &&
        _totalUserObjects[_activeAppId][forMetric] &&
        _totalUserObjects[_activeAppId][forMetric][_period] &&
        _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"]) {

        var currObj = _totalUserObjects[_activeAppId][forMetric][_period],
            currRefreshObj = _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"],
            newRefreshObj = formatCalculatedObj(todaysJson, forMetric);

        Object.keys(newRefreshObj).forEach(function(key) {
            var value = newRefreshObj[key];
            if (typeof currRefreshObj[key] !== "undefined") {
                // If existing refresh object contains the key we refresh the value
                // in total user object to curr value + new refresh value - curr refresh value
                currObj[key] += value - currRefreshObj[key];
            }
            else {
                // Total user object doesn't have this key so we just add it
                currObj[key] = value;
            }
        });

        // Both total user obj and refresh object is changed, update our var
        _totalUserObjects[_activeAppId][forMetric][_period] = currObj;
        _totalUserObjects[_activeAppId][forMetric][_period + "_refresh"] = newRefreshObj;
    }
}

/**
 * Initialize total users data for a metric
 * @param {string} forMetric - metric to initialize
 * @returns {Promise|boolean} jQuery promise or true
 */
export function initialize(forMetric) {
    _period = countlyCommon.getPeriodForAjax();
    _activeAppId = countlyCommon.ACTIVE_APP_ID;

    if (!isUsable()) {
        return true;
    }

    if (isInitialized(forMetric)) {
        return refresh(forMetric);
    }

    setInit(forMetric);

    /*
        Format of the API request is
        /o?method=total_users & metric=countries & period=X & api_key=Y & app_id=Y
    */
    if (_period === "hour") {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": _activeAppId,
                "method": "total_users",
                "metric": forMetric,
                "period": _period
            },
            dataType: "json",
            success: function(json) {
                setCalculatedObj(forMetric, json);
                setRefreshObj(forMetric, json);
            }
        });
    }
    else {
        return jQuery.when(
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": _activeAppId,
                    "method": "total_users",
                    "metric": forMetric,
                    "period": _period
                },
                dataType: "json",
                success: function(json) {
                    setCalculatedObj(forMetric, json);
                }
            }),
            jQuery.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "total_users",
                    "metric": forMetric,
                    "period": "hour"
                },
                dataType: "json",
                success: function(json) {
                    setRefreshObj(forMetric, json);
                }
            })
        ).then(function() {
            return true;
        });
    }
}

/**
 * Refresh total users data for a metric
 * @param {string} forMetric - metric to refresh
 * @returns {Promise} jQuery promise
 */
export function refresh(forMetric) {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r,
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "method": "total_users",
            "metric": forMetric,
            "period": "hour",
            "action": "refresh",
            "_dt": Date.now()
        },
        dataType: "json",
        success: function(todaysJson) {
            refreshData(forMetric, todaysJson);
        }
    });
}

/**
 * Get total users data for a metric
 * @param {string} forMetric - metric to get data for
 * @param {boolean} prev - whether to get previous period data
 * @returns {object} total users data object
 */
export function get(forMetric, prev) {
    if (_totalUserObjects[_activeAppId] && _totalUserObjects[_activeAppId][forMetric]) {
        if (prev) {
            return _totalUserObjects[_activeAppId][forMetric]["prev_" + _period] || {};
        }
        return _totalUserObjects[_activeAppId][forMetric][_period] || {};
    }
    else {
        return {};
    }
}

/**
 * Total user override can only be used if selected period contains today
 * unless overwritten by plugin
 * API returns empty object if requested date doesn't contain today
 * @returns {boolean} whether total users is usable
 */
export function isUsable() {
    if (countlyGlobal.plugins.indexOf("drill") !== -1) {
        return true;
    }
    return countlyCommon.periodObj.periodContainsToday;
}

/**
 * Clear data for a specific app
 * @param {string} appId - app ID to clear data for
 */
export function clearAppData(appId) {
    delete _totalUserObjects[appId];
    delete _initialized[appId];
}

// Event handlers for app reset and delete
jQuery(document).on("/i/apps/reset", function(event, args) {
    clearAppData(args.app_id);
});

jQuery(document).on("/i/apps/delete", function(event, args) {
    clearAppData(args.app_id);
});

// Create a namespace object for backward compatibility
const countlyTotalUsers = {
    initialize,
    refresh,
    get,
    isUsable,
    clearAppData
};

// Default export for convenience
export default countlyTotalUsers;