/*global countlyAnalyticsAPI, $, countlyCommon, countlyGlobal */
(function() {
    window.countlyAnalyticsAPI = window.countlyAnalyticsAPI || {};

    countlyAnalyticsAPI.data = {};
    countlyAnalyticsAPI.metrics = {
        "mobile": '["platforms", "devices", "carriers"]',
        "desktop": '["platforms", "resolutions", "languages"]',
        "web": '["platforms", "sources", "browser"]'
    };

    countlyAnalyticsAPI.initialize = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/analytics/tops",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "metrics": countlyAnalyticsAPI.metrics[countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID].type]
            },
            dataType: "json",
            success: function(json) {
                countlyAnalyticsAPI.data = json;
            }
        });
    };

    countlyAnalyticsAPI.getTop = function(metric) {
        return countlyAnalyticsAPI.data[metric];
    };
}());