/*global jQuery, countlyCommon, moment, countlyGlobal*/

(function(countlyDataPoints, $) {
    //Private Properties
    var _dataPointsObj = {},
        _periods = [],
        _selectedPeriod = "";

    //Public Methods
    countlyDataPoints.initialize = function() {
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/server-stats/data-points",
                data: {},
                dataType: "json",
                success: function(json) {
                    countlyDataPoints.reset();
                    _dataPointsObj = json;

                    // format months object
                    var periods = Object.keys(json["all-apps"]).splice(0, 2).concat(Object.keys(json["all-apps"]).splice(11, 14));

                    if (_dataPointsObj["all-apps"]) {
                        for (var i = 0; i < periods.length; i++) {
                            _selectedPeriod = periods[i];

                            if (i > 1) {
                                _periods.push({
                                    period: periods[i],
                                    text: moment(periods[i], "YYYY-M").format("MMM YYYY")
                                });
                            }
                            else {
                                _periods.push({
                                    period: periods[i],
                                    text: periods[i].replace("_", " ")
                                });
                            }
                        }
                    }
                }
            })
        ).then(function() {
            return true;
        });
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
            var periodData = _dataPointsObj[app][_selectedPeriod];

            tableData.push({
                "app-name": getAppName(app),
                "sessions": periodData.sessions,
                "events": periodData.events,
                "data-points": periodData["data-points"]
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
            return jQuery.i18n.map["compare.apps.all-apps"] || "All apps";
        }
        else if (countlyGlobal.apps[appId]) {
            return countlyGlobal.apps[appId].name;
        }
        else {
            return "Deleted app";
        }
    }

})(window.countlyDataPoints = window.countlyDataPoints || {}, jQuery);