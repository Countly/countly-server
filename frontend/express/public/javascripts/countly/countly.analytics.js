/*global countlyAnalyticsAPI, $, countlyCommon */
(function() {
    window.countlyAnalyticsAPI = window.countlyAnalyticsAPI || {};

    countlyAnalyticsAPI.data = {};
    countlyAnalyticsAPI.currentAPP = "";
    countlyAnalyticsAPI.currentPeriod = "";
    countlyAnalyticsAPI.initialize = function(metrics, forceReload) {
        //reload only if forced/ App changed or priod changed
        var _period = countlyCommon.getPeriodForAjax();
        if (forceReload || countlyAnalyticsAPI.currentAPP === "" || countlyAnalyticsAPI.currentAPP !== countlyCommon.ACTIVE_APP_ID || countlyAnalyticsAPI.currentPeriod === "" || countlyAnalyticsAPI.currentPeriod !== _period) {
            var curApp = countlyCommon.ACTIVE_APP_ID;
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/analytics/tops",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "metrics": JSON.stringify(metrics),
                    "period": _period
                },
                dataType: "json",
                success: function(json) {
                    countlyAnalyticsAPI.data = json;
                    countlyAnalyticsAPI.currentPeriod = _period;
                    countlyAnalyticsAPI.currentAPP = curApp;
                }
            });
        }
        else {
            return;
        }
    };

    countlyAnalyticsAPI.getTop = function(metric) {
        return countlyAnalyticsAPI.data && countlyAnalyticsAPI.data[metric];
    };
}());