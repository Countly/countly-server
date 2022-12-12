/*globals $,countlyErrorLogs,countlyGlobal,jQuery,countlyCommon,CountlyHelpers,app,countlyVue,CV,countlyAuth */
(function() {
    var FEATURE_NAME = "errorlogs";
    var ErrorLogsView = countlyVue.views.create({
        template: CV.T('/errorlogs/templates/logs.html'),
        data: function() {
            return {
                selectLog: this.query || "api",
                downloadLink: countlyGlobal.path + "/o/errorlogs?auth_token=" + countlyGlobal.auth_token + "&download=true&log=" + this.query || "api",
                logList: [{name: "Api Log", value: "api"}],
                cachedLog: {}
            };
        },
        props: {
            query: {
                default: "api"
            }
        },
        created: function() {
            var self = this;
            return $.when(countlyErrorLogs.initialize(), countlyErrorLogs.getLogByName(this.query || "api"))
                .then(function() {
                    self.logList = countlyErrorLogs.getLogNameList();
                    self.cachedLog = countlyErrorLogs.getLogCached();
                });
        },
        methods: {
            refresh: function(force) {
                var self = this;
                if (force) {
                    return $.when(countlyErrorLogs.getLogByName(this.selectLog))
                        .then(function() {
                            self.cachedLog = countlyErrorLogs.getLogCached();
                        });
                }
            },
            changeLog: function(value) {
                this.downloadLink = countlyGlobal.path + "/o/errorlogs?auth_token=" + countlyGlobal.auth_token + "&download=true&log=" + value,
                app.navigate("#/manage/logs/errorlogs/" + value);
                this.refresh(true);
            },
            clear: function() {
                var self = this;
                CountlyHelpers.confirm(jQuery.i18n.map["errorlogs.confirm-delete-" + self.selectLog] || jQuery.i18n.map["errorlogs.confirm-delete"], "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }
                    $.when(countlyErrorLogs.del(self.selectLog)).then(function(resData) {
                        if (resData.result === "Success") {
                            $.when(countlyErrorLogs.initialize()).then(function() {
                                countlyErrorLogs.getLogByName(self.selectLog, function() {
                                    self.refresh(true);
                                });
                            });
                        }
                        else {
                            CountlyHelpers.alert(resData.result, "red");
                        }
                    });
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["common.yes-clear-it"]], {title: jQuery.i18n.map["errorlogs.confirm-delete-" + self.selectLog + "-title"] || jQuery.i18n.map["errorlogs.confirm-delete-title"], image: "clear-api-logs"});
            }
        }
    });
    if (countlyAuth.validateGlobalAdmin()) {
        countlyVue.container.registerTab("/manage/logs", {
            priority: 1,
            route: "#/manage/logs/errorlogs",
            component: ErrorLogsView,
            title: "Server Logs",
            name: "errorlogs",
            permission: FEATURE_NAME,
            vuex: []
        });
    }
})();
