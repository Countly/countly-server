/*global jQuery, countlyCommon, countlyGlobal*/

(function(countlyDataPoints, $) {
    //Private Properties
    var _dataPointsObj = {},
        _periods = [],
        _todPunchCardData = [],
        _selectedPeriod = "",
        _top = [];

    //Public Methods
    countlyDataPoints.initialize = function(options) {
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/server-stats/data-points",
                data: {
                    "period": countlyCommon.getPeriodAsDateStrings(),
                    "selected_app": options.app_id || "",
                },
                dataType: "json",
                success: function(json) {
                    countlyDataPoints.reset();
                    _dataPointsObj = json;
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyDataPoints.punchCard = function(options) {
        var data = {};
        data.period = countlyCommon.getPeriodAsDateStrings();

        if (options.app_id) {
            data.selected_app = options.app_id;
        }
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/server-stats/punch-card",
                dataType: "json",
                data: data,
                success: function(json) {
                    _todPunchCardData = json;
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyDataPoints.calculateTop = function(/*options*/) {
        var data = {};
        data.period = countlyCommon.getPeriodAsDateStrings();
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/server-stats/top",
                dataType: "json",
                //data: data,
                success: function(json) {
                    _top = json;
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyDataPoints.getPunchCardData = function() {
        return _todPunchCardData;
    };

    countlyDataPoints.getTop = function() {
        _top = _top || [];
        for (var z = 0; z < _top.length; z++) {
            _top[z].value = countlyCommon.formatNumber(_top[z].v || 0);
            _top[z].name = getAppName(_top[z].a);
        }
        return _top;
    };

    countlyDataPoints.refresh = function() {
        return true;
    };

    countlyDataPoints.reset = function() {
        _dataPointsObj = {};
        _periods = [];
        _selectedPeriod = "";
    };

    countlyDataPoints.getTableData = function() {
        var tableData = [];

        for (var app in _dataPointsObj) {
            var periodData = _dataPointsObj[app];

            var approx = false;
            var total = ((periodData.sessions || 0) + (periodData.events || 0) + (periodData.push || 0));
            if (app !== "all-apps" && app !== "natural-dp" && app !== "[CLY]_consolidated" && total < periodData.dp) {
                //var subtotal = (periodData.sessions + periodData.events) || 1;
                periodData.sessions = null;
                periodData.events = null;
                approx = true;
            }
            var appId = app;
            if (appId === "all-apps" || appId === "natural-dp") {
                appId = null;
            }
            var brokendownEvents = {
                "crashes": periodData.crash,
                "views": periodData.views,
                "actions": periodData.actions,
                "nps": periodData.nps,
                "surveys": periodData.surveys,
                "ratings": periodData.ratings,
                "apm": periodData.apm,
                "custom": periodData.custom,
            };
            let sortable = [];
            for (var event in brokendownEvents) {
                sortable.push([event, brokendownEvents[event]]);
            }

            sortable.sort(function(a, b) {
                return b[1] - a[1];
            });

            tableData.push({
                "appName": getAppName(app),
                "appId": appId,
                "sessions": periodData.sessions,
                "push": periodData.push,
                "data-points": periodData.dp,
                "change": periodData.change,
                "approximated": approx,
                "events": periodData.events,
                "events_breakdown": {
                    "crashes": periodData.crash,
                    "views": periodData.views,
                    "actions": periodData.actions,
                    "nps": periodData.nps,
                    "surveys": periodData.surveys,
                    "ratings": periodData.ratings,
                    "apm": periodData.apm,
                    "custom": periodData.custom,
                },
                "sorted_breakdown": sortable,
            });
        }

        return tableData;
    };

    countlyDataPoints.getPeriods = function() {
        for (var i = 0; i < _periods.length; i++) {
            _periods[i].selected = (_periods[i].period === _selectedPeriod);
        }

        return _periods;
    };

    countlyDataPoints.setPeriod = function(period) {
        _selectedPeriod = period;
    };

    /**
    * Returns a human readable name given application id.
    * @param {string} appId - Application Id
    * @returns {string} Returns a readable name
    **/
    function getAppName(appId) {
        if (appId === "all-apps") {
            return "(" + (jQuery.i18n.map["server-stats.all-datapoints"] || "All Datapoints") + ")";
        }
        else if (appId === "[CLY]_consolidated") {
            return "(" + (jQuery.i18n.map["server-stats.consolidated-datapoints"] || "Consolidated Datapoints") + ")";
        }
        else if (appId === "natural-dp") {
            return "(" + (jQuery.i18n.map["server-stats.natural-datapoints"] || "Natural Datapoints") + ")";
        }
        else if (countlyGlobal.apps[appId]) {
            return countlyGlobal.apps[appId].name;
        }
        else {
            return "App name not available (" + appId + ")";
        }
    }

})(window.countlyDataPoints = window.countlyDataPoints || {}, jQuery);