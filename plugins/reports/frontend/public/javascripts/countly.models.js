/*global
    countlyCommon,
    countlyGlobal,
    jQuery
 */
(function(countlyReporting, $) {
    //Private Properties
    var _data = {};
    var _metrics = [
        {name: jQuery.i18n.map["reports.analytics"], value: "analytics"},
        {name: jQuery.i18n.map["reports.events"], value: "events"},
        {name: jQuery.i18n.map["reports.revenue"], value: "revenue"},
        {name: jQuery.i18n.map["reports.crash"], value: "crash"},
    ];

    //Public Methods
    countlyReporting.initialize = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/reports/all",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                if (json.length > 0) {
                    for (var i = 0; i < json.length; i++) {
                        json[i].title = json[i].title ? json[i].title : '';
                        json[i].report_type = json[i].report_type || "core";
                        json[i].enabled = json[i].enabled + '' === 'false' ? false : true;
                        json[i].pluginEnabled = json[i].report_type === "core" ? true : countlyGlobal.plugins.indexOf(json[i].report_type) > -1;
                    }
                }
                _data = json;
            }
        });
    };

    countlyReporting.getData = function() {
        return _data;
    };

    countlyReporting.create = function(args) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/reports/create",
            data: {
                args: JSON.stringify(args),
                app_id: args.apps[0]
            }
        });
    };

    countlyReporting.update = function(args) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/reports/update",
            data: {
                args: JSON.stringify(args),
                app_id: args.apps[0]
            }
        });
    };

    countlyReporting.del = function(id) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/reports/delete",
            data: {
                args: JSON.stringify({
                    "_id": id
                }),
                "app_id": countlyCommon.ACTIVE_APP_ID
            }
        });
    };

    countlyReporting.send = function(id) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/reports/send",
            data: {
                args: JSON.stringify({
                    "_id": id
                }),
                "app_id": countlyCommon.ACTIVE_APP_ID
            }
        });
    };

    countlyReporting.updateStatus = function(args) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/reports/status",
            data: {
                args: JSON.stringify(args),
                app_id: countlyCommon.ACTIVE_APP_ID
            }
        });
    };

    countlyReporting.getReport = function(id) {
        for (var i = 0; i < _data.length; i++) {
            if (_data[i]._id === id) {
                return _data[i];
            }
        }
        return null;
    };

    countlyReporting.addMetric = function(m) {
        var existed = _metrics.filter(function(item) {
            return item.value === m.value;
        });
        if (existed.length === 0) {
            _metrics.push(m);
        }
    };

    countlyReporting.getMetrics = function() {
        return _metrics;
    };
}(window.countlyReporting = window.countlyReporting || {}, jQuery));
