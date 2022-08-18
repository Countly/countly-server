/*globals $,countlyErrorLogs,countlyGlobal,jQuery,countlyCommon,CountlyHelpers,app,countlyVue,CV,countlyAuth, countlyLoggerService */
(function() {
    var FEATURE_NAME = "errorlogs";
    var ServerLogsView = countlyVue.views.create({
        template: CV.T('/errorlogs/templates/logs.html'),
        data: function() {
            return {
                selectLog: this.query || "api",
                downloadLink: countlyGlobal.path + "/o/errorlogs?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&download=true&log=" + this.query || "api",
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
                this.downloadLink = countlyGlobal.path + "/o/errorlogs?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&download=true&log=" + value,
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

    var ClientLogsView = countlyVue.views.create({
        template: CV.T('/errorlogs/templates/client-logs.html'),
        data: function() {
            return {
                logs: "",
                isLoading: false,
            };
        },
        methods: {
            setLogs: function(value) {
                this.logs = value;
            },
            clear: function() {
                var self = this;
                CountlyHelpers.confirm(
                    CV.i18n("errorlogs.confirm-delete-client-logs"),
                    "popStyleGreen",
                    function(result) {
                        if (!result) {
                            return;
                        }
                        self.isLoading = true;
                        countlyLoggerService.clear()
                            .then(function() {
                                self.setLogs("");
                            })
                            .catch(function(error) {
                                CountlyHelpers.notify({message: error.message || error, type: error});
                            }).finally(function() {
                                self.isLoading = false;
                            });
                    },
                    [CV.i18n("common.no-dont-delete"), CV.i18n("common.yes-clear-it")],
                    {
                        title: CV.i18n("errorlogs.clear-client-logs"),
                    });
            },
            download: function() {
                var self = this;
                this.isLoading = true;
                countlyLoggerService.export()
                    .catch(function(error) {
                        CountlyHelpers.notify({message: error.message || error, type: error});
                    }).finally(function() {
                        self.isLoading = false;
                    });
            },
            getLogs: function() {
                var self = this;
                this.isLoading = true;
                countlyLoggerService.getLogs()
                    .then(function(result) {
                        self.setLogs(result);
                    }).catch(function(error) {
                        CountlyHelpers.notify({message: error.message || error, type: error});
                        self.setLogs("");
                    }).finally(function() {
                        self.isLoading = false;
                    });
            },
            refresh: function() {
                this.getLogs();
            }
        },
        mounted: function() {
            this.getLogs();
        }
    });

    if (countlyAuth.validateGlobalAdmin()) {
        countlyVue.container.registerTab("/manage/logs", {
            priority: 1,
            route: "#/manage/logs/errorlogs",
            component: ServerLogsView,
            title: "Server Logs",
            name: "errorlogs",
            permission: FEATURE_NAME,
            vuex: []
        });
    }
    countlyVue.container.registerTab("/manage/logs", {
        priority: 3,
        route: "#/manage/logs/clientlogs",
        component: ClientLogsView,
        title: "Client Logs",
        name: "clientlogs",
        permission: FEATURE_NAME,
        vuex: []
    });
})();
