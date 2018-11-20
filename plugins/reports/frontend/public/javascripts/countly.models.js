/*global
    countlyCommon,
    countlyGlobal,
    jQuery
 */
(function(countlyReporting, $) {

    //Private Properties
    var _data = {};
    var _emailList = [];
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

    countlyReporting.requestEmailAddressList = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/reports/email",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                _emailList = json;
            }
        });
    };

    countlyReporting.getEmailAddressList = function() {
        var data = [];
        _emailList.forEach(function(item) {
            data.push({name: item.email, value: item.email});
        });
        return data;
    };

    countlyReporting.getData = function() {
        return _data;
    };

    countlyReporting.create = function(args) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/reports/create",
            data: {
                args: JSON.stringify(args)
            }
        });
    };

    countlyReporting.update = function(args) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/reports/update",
            data: {
                args: JSON.stringify(args)
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
                })
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
                })
            }
        });
    };

    countlyReporting.updateStatus = function(args) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/reports/status",
            data: {
                args: JSON.stringify(args)
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
}(window.countlyReporting = window.countlyReporting || {}, jQuery));