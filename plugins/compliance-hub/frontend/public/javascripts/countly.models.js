/*globals CountlyHelpers,jQuery,countlyCommon,countlyTaskManager */
(function(countlyConsentManager, $) {

    CountlyHelpers.createMetricModel(countlyConsentManager, {name: "consents", estOverrideMetric: "consents"}, jQuery);

    countlyConsentManager.clearObject = function(obj) {
        if (obj) {
            if (!obj.i) {
                obj.i = 0;
            }
            if (!obj.o) {
                obj.o = 0;
            }
            if (!obj.e) {
                obj.e = 0;
            }
            if (!obj.p) {
                obj.p = 0;
            }
        }
        else {
            obj = {"i": 0, "o": 0, "e": 0, "p": 0};
        }

        return obj;
    };

    countlyConsentManager.getConsentDP = function(segment) {

        var chartData = [
                { data: [], label: jQuery.i18n.map["consent.opt-i"] },
                { data: [], label: jQuery.i18n.map["consent.opt-o"] }
            ],
            dataProps = [
                { name: "i" },
                { name: "o" }
            ];

        return countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.clearObject, chartData, dataProps, segment);
    };

    countlyConsentManager.getExportDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["consent.userdata-exports"], color: '#DDDDDD', mode: "ghost" },
                { data: [], label: jQuery.i18n.map["consent.userdata-exports"] }
            ],
            dataProps = [
                {
                    name: "pe",
                    func: function(dataObj) {
                        return dataObj.e;
                    },
                    period: "previous"
                },
                { name: "e" }
            ];

        return countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.clearObject, chartData, dataProps);
    };

    countlyConsentManager.getPurgeDP = function() {

        var chartData = [
                { data: [], label: jQuery.i18n.map["consent.userdata-purges"], color: '#DDDDDD', mode: "ghost" },
                { data: [], label: jQuery.i18n.map["consent.userdata-purges"] }
            ],
            dataProps = [
                {
                    name: "pp",
                    func: function(dataObj) {
                        return dataObj.p;
                    },
                    period: "previous"
                },
                { name: "p" }
            ];

        return countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.clearObject, chartData, dataProps);
    };


    countlyConsentManager.getBigNumbersData = function(segment) {
        return countlyCommon.getDashboardData(countlyConsentManager.getDb(), ["i", "o"], [], {}, countlyConsentManager.clearObject, segment);
    };

    countlyConsentManager.getEPData = function() {
        return countlyCommon.getDashboardData(countlyConsentManager.getDb(), ["e", "p"], [], {}, countlyConsentManager.clearObject);
    };

    countlyConsentManager.common = function(data, path, callback) {
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/consent/' + path,
            data: data,
            dataType: "json",
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    //export data for user based on passed id
    //callback(error, fileid(if exist), taskid(if exist))
    countlyConsentManager.exportUser = function(query, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/export",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "query": query
            },
            success: function(result) {
                var task_id = null;
                var fileid = null;
                if (result && result.result && result.result.task_id) {
                    task_id = result.result.task_id;
                    countlyTaskManager.monitor(task_id);
                }
                else if (result && result.result) {
                    fileid = result.result;
                }
                callback(null, fileid, task_id);
            },
            error: function(xhr, status, error) {
                var filename = null;
                if (xhr && xhr.responseText && xhr.responseText !== "") {
                    var ob = JSON.parse(xhr.responseText);
                    if (ob.result && ob.result.message) {
                        error = ob.result.message;
                    }
                    if (ob.result && ob.result.filename) {
                        filename = ob.result.filename;
                    }
                }
                callback(error, filename, null);
            }
        });
    };


    countlyConsentManager.deleteExport = function(eid, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/deleteExport/appUser_" + countlyCommon.ACTIVE_APP_ID + "_" + eid,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
            },
            success: function(result) {
                callback(null, result);
            },
            error: function(xhr, status, error) {
                callback(error, null);
            }
        });
    };

    countlyConsentManager.deleteUserdata = function(query, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/delete",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "query": query
            },
            success: function(result) {
                callback(null, result);
            },
            error: function(xhr, status, error) {
                callback(error, null);
            }
        });
    };

}(window.countlyConsentManager = window.countlyConsentManager || {}, jQuery));