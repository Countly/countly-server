/*globals countlyCommon,jQuery */
(function(countlyErrorLogs, $) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlyErrorLogs.initialize = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/errorlogs",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "bytes": 100000
            },
            success: function(json) {
                _data = json;
            }
        });
    };

    countlyErrorLogs.getData = function() {
        return _data;
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