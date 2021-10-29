/*globals countlyCommon,jQuery */
(function(countlyErrorLogs, $) {

    //Private Properties
    var _list = [];
    var _logCache = {};

    //Public Methods
    countlyErrorLogs.initialize = function() {
        return $.ajax({
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
        return $.ajax({
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
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/errorlogs",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                log: id
            }
        });
    };

}(window.countlyErrorLogs = window.countlyErrorLogs || {}, jQuery));
