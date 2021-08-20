/*globals $,countlyAuth,countlyErrorLogs,countlyGlobal,jQuery,countlyCommon,CountlyHelpers,app,countlyVue,CV */
(function() {
    var FEATURE_NAME = "errorlogs";
    var ErrorLogsView = countlyVue.views.create({
        template: CV.T('/errorlogs/templates/logs.html'),
        data: function() {
            return {
                selectLog: this.$route.params.log || "api",
                downloadLink: countlyGlobal.path + "/o/errorlogs?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&download=true&log=" + this.$route.params.log || "api",
                logList: [{name: "api Log", value: "api"}],
                cachedLog: {}
            };
        },
        beforeCreate: function() {
            var self = this;
            return $.when(countlyErrorLogs.initialize(), countlyErrorLogs.getLogByName(this.$route.params.log || "api"))
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
                app.navigate("#/manage/errorlogs/" + value);
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

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ErrorLogsView,
            vuex: [] //empty array if none
        });
    };

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route('/manage/errorlogs', 'errorlogs', function() {
            var view = getMainView();
            view.params = {log: "api"};
            this.renderWhenReady(view);
        });

        app.route('/manage/errorlogs/*log', 'errorlogs', function(log) {
            var view = getMainView();
            view.params = {log: log};
            this.renderWhenReady(view);
        });


        $(document).ready(function() {
            app.addMenu("management", {code: "errorlogs", url: "#/manage/errorlogs", text: "errorlogs.title", icon: '<div class="logo-icon fa fa-server"></div>', priority: 60});
        });
    }
})();
