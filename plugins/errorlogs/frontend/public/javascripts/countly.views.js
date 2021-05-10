/*globals countlyView,$,countlyAuth,countlyErrorLogs,countlyGlobal,T,jQuery,countlyCommon,CountlyHelpers,app,ErrorLogsView */
window.ErrorLogsView = countlyView.extend({
    featureName: 'errorlogs',
    initialize: function() {

    },
    beforeRender: function() {
        var self = this;
        return $.when(T.render('/errorlogs/templates/logs.html', function(src) {
            self.template = src;
        }), countlyErrorLogs.initialize()).then(function() {
            var logNames = countlyErrorLogs.getLogNameList();
            if (logNames.length > 0) {
                return countlyErrorLogs.getLogByName(logNames[0].value);
            }
        });
    },
    renderCommon: function(isRefresh) {
        var cachedLog = countlyErrorLogs.getLogCached();
        var download = countlyGlobal.path + "/o/errorlogs?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&download=true&log=";
        this.templateData = {
            "page-title": jQuery.i18n.map["errorlogs.title"],
            download: download,
            logName: cachedLog.name,
            logData: cachedLog.data,
        };
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            var logList = countlyErrorLogs.getLogNameList();
            $("#error-logger-selector").clySelectSetItems(logList);
            if (cachedLog.name) {
                $("#error-logger-selector").clySelectSetSelection(cachedLog.name, cachedLog.name + " Log");
            }
            $("#error-logger-selector").off("cly-select-change").on("cly-select-change", function(e, selected) {
                countlyErrorLogs.getLogByName(selected, function() {
                    self.renderCommon();
                    app.localize();
                });
            });
            $("#tabs").tabs();
            $(".btn-clear-log").on("click", function() {
                var id = $(this).data("id");
                CountlyHelpers.confirm(jQuery.i18n.map["errorlogs.confirm-delete-" + id] || jQuery.i18n.map["errorlogs.confirm-delete"], "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }
                    $.when(countlyErrorLogs.del(id)).then(function(resData) {
                        if (resData.result === "Success") {
                            $.when(countlyErrorLogs.initialize()).then(function() {
                                countlyErrorLogs.getLogByName(id, function() {
                                    self.renderCommon();
                                    app.localize();
                                });
                            });
                        }
                        else {
                            CountlyHelpers.alert(resData.result, "red");
                        }
                    });
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["common.yes-clear-it"]], {title: jQuery.i18n.map["errorlogs.confirm-delete-" + id + "-title"] || jQuery.i18n.map["errorlogs.confirm-delete-title"], image: "clear-api-logs"});
            });
        }
    },
    refresh: function() {
    }
});


//register views
app.errorLogsView = new ErrorLogsView();

if (countlyAuth.validateRead(app.errorLogsView.featureName)) {
    app.route('/manage/errorlogs', 'errorlogs', function() {
        this.renderWhenReady(this.errorLogsView);
    });
}

$(document).ready(function() {
    if (countlyAuth.validateRead(app.errorLogsView.featureName)) {
        app.addMenu("management", {code: "errorlogs", url: "#/manage/errorlogs", text: "errorlogs.title", icon: '<div class="logo-icon fa fa-server"></div>', priority: 60});
    }
});
