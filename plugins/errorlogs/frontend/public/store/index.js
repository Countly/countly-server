import jQuery from 'jquery';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

var _list = [];
var _logCache = {};

var countlyErrorLogs = {};

countlyErrorLogs.initialize = function() {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r + "/errorlogs",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "bytes": 1
        },
        success: function(json) {
            _list = [];
            for (var k in json) {
                _list.push({ name: k.charAt(0).toUpperCase() + k.slice(1).toLowerCase() + " Log", value: k });
            }
        }
    });
};

countlyErrorLogs.getLogNameList = function() {
    return _list;
};

countlyErrorLogs.getLogCached = function() {
    return _logCache;
};

countlyErrorLogs.getLogByName = function(logName, callback) {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r + "/errorlogs",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "bytes": 100000,
            "log": logName
        },
        success: function(data) {
            _logCache = {name: logName, data: data};
        },
        complete: function() {
            if (callback) {
                callback();
            }
        }
    });
};

countlyErrorLogs.del = function(id) {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.w + "/errorlogs",
        data: {
            app_id: countlyCommon.ACTIVE_APP_ID,
            log: id
        }
    });
};

export default countlyErrorLogs;
