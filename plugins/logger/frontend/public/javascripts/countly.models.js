/*global countlyCommon, CountlyHelpers $*/
(function(countlyLogger) {
    countlyLogger.getRequestLogs = function(query) {
        query = query || {};
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "logs",
                "filter": JSON.stringify(query)
            },
            success: function(json) {
                return json;
            },
            error: function(xhr, status, error) {
                if (error && status !== 'abort') {
                    CountlyHelpers.alert(error, "red");
                }
            }
        });
    };

    countlyLogger.getCollectionInfo = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "collection_info"
            },
            success: function(json) {
                return json;
            },
            error: function(xhr, status, error) {
                if (error && status !== 'abort') {
                    CountlyHelpers.alert(error, "red");
                }
            }
        });
    };
}(window.countlyLogger = window.countlyLogger || {}));
