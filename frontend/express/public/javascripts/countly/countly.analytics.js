/*global countlyAnalyticsAPI, $, countlyCommon */
(function() {
    window.countlyAnalyticsAPI = window.countlyAnalyticsAPI || {};

    countlyAnalyticsAPI.data = {};

    countlyAnalyticsAPI.initialize = function(metrics) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/analytics/tops",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "metrics": JSON.stringify(metrics)
            },
            dataType: "json",
            success: function(json) {
                countlyAnalyticsAPI.data = json;
            }
        });
    };

    countlyAnalyticsAPI.getTop = function(metric) {
        return countlyAnalyticsAPI.data && countlyAnalyticsAPI.data[metric];
    };
}());