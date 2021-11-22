/*global app, countlyVue, CV, Vue, countlyGlobal, countlyCommon, moment, CountlyHelpers, countlyTaskManager */

(function() {

    var ManualReportsView = countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager-manual.html')
    });

    var AutomaticReportsView = countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager-auto.html')
    });

    var ReportManagerView = countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager.html'),
        data: function() {
            return {
                dynamicTab: "manual-reports-tab",
                localTabs: [
                    {
                        title: CV.i18n('report-maanger.manually-created'),
                        name: "manual-reports-tab",
                        component: ManualReportsView
                    },
                    {
                        title: CV.i18n('report-maanger.automatically-created'),
                        name: "automatic-reports-tab",
                        component: AutomaticReportsView
                    }
                ]
            };
        }
    });


    var UnreadPin = countlyVue.views.create({
        template: "<div v-if='isActive' class='cly-bullet cly-bullet--orange bu-mr-1'></div>",
        props: {
            appId: {
                type: String
            },
            taskId: {
                type: String,
                default: null
            },
            autoRead: {
                type: Boolean,
                default: false
            }
        },
        computed: {
            isActive: function() {
                var unread = this.$store.state.countlyTaskManager.unread;
                return !!unread[this.appId][this.taskId];
            }
        },
        data: function() {
            return {
                isMounted: false,
            };
        },
        mounted: function() {
            this.isMounted = true;
        },
        methods: {
            checkAutoRead: function() {
                if (this.autoRead && this.isMounted && this.isActive) {
                    var self = this;
                    setTimeout(function() {
                        self.$store.commit("countlyTaskManager/setRead", {
                            taskId: self.taskId,
                            appId: self.appId
                        });
                    }, 3000);
                }
            }
        },
        watch: {
            isActive: function() {
                this.checkAutoRead();
            },
            isMounted: function() {
                this.checkAutoRead();
            }
        }
    });

    Vue.component("cly-report-manager-table", countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager-table.html'),
        components: {
            "unread-pin": UnreadPin
        },
        mixins: [countlyVue.mixins.commonFormatters],
        props: {
            reportType: {
                type: String,
                default: "manual"
            },
            fixedOrigin: {
                type: String,
                default: null
            },
            compact: {
                type: Boolean,
                default: false
            },
            disableAutoNavigationToTask: {
                type: Boolean,
                default: false
            }
        },
        computed: {
            isManual: function() {
                return this.reportType === 'manual';
            },
            canDeleteReport: function() {
                return countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID];
            },
            query: function() {
                var q = {};
                if (this.fixedOrigin) {
                    q.type = this.fixedOrigin;
                }
                else if (this.selectedOrigin && this.selectedOrigin !== "all") {
                    q.type = this.selectedOrigin;
                }
                if (this.selectedRunTimeType && this.selectedRunTimeType !== "all") {
                    q.autoRefresh = this.selectedRunTimeType;
                }
                if (this.selectedState && this.selectedState !== "all") {
                    q.status = this.selectedState;
                }
                return q;
            }
        },
        watch: {
            "query": function() {
                this.refresh(true);
            }
        },
        data: function() {
            var self = this;
            var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("reportsTable", {
                columns: ["start"],
                onRequest: function() {
                    var queryObject = Object.assign({}, self.query);
                    if (self.isManual) {
                        queryObject.manually_create = true;
                    }
                    else {
                        queryObject.manually_create = {$ne: true};
                        delete queryObject.autoRefresh;
                    }
                    return {
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/tasks/list?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
                        data: {
                            query: JSON.stringify(queryObject)
                        }
                    };
                },
                onOverrideRequest: function(context, request) {
                    self.lastRequestPayload = request.data;
                },
                onError: function(context, err) {
                    throw err;
                },
                onReady: function(context, rows) {
                    rows.forEach(function(row) {
                        if (row.taskgroup && row.subtasks) {
                            var stat = null;
                            for (var k in row.subtasks) {
                                if (stat && row.subtasks[k].status !== stat) {
                                    row.hasStatusDifferences = true;
                                }
                                stat = row.subtasks[k].status;
                                if (row.subtasks[k].status === "running" || row.subtasks[k].status === "rerunning") {
                                    row.status = row.subtasks[k].status;
                                    row.start = row.subtasks[k].start || row.start;
                                }
                                if (row.end < row.subtasks[k].end) {
                                    row.end = row.subtasks[k].end;
                                }
                            }
                        }
                        row.startFormatted = countlyCommon.formatTimeAgoText(row.start);
                        var time = 0;
                        if (row.status === "running" || row.status === "rerunning") {
                            time = Math.max(new Date().getTime() - row.start, 0);
                        }
                        else if (row.end && row.end > row.start) {
                            time = row.end - row.start;
                        }
                        row.duration = countlyCommon.formatTime(Math.round(time / 1000));
                    });
                    return rows;
                }
            }));
            return {
                tableStore: tableStore,
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "reportsTable"),
                availableOrigins: {
                    "all": CV.i18n("common.all"),
                    "funnels": CV.i18n("sidebar.funnels") || "Funnels",
                    "drill": CV.i18n("drill.drill") || "Drill",
                    "flows": CV.i18n("flows.flows") || "Flows",
                    "retention": CV.i18n("retention.retention") || "Retention",
                    "formulas": CV.i18n("calculated-metrics.formulas") || "Formulas",
                    "dbviewer": CV.i18n("dbviewer.title") || "DBViewer"
                },
                availableRunTimeTypes: {
                    "all": CV.i18n("common.all"),
                    "auto-refresh": CV.i18n("taskmanager.auto"),
                    "none-auto-refresh": CV.i18n("taskmanager.manual")
                },
                availableStates: {
                    "all": CV.i18n("common.all"),
                    "running": CV.i18n("common.running"),
                    "rerunning": CV.i18n("taskmanager.rerunning"),
                    "completed": CV.i18n("common.completed"),
                    "errored": CV.i18n("common.errored")
                },
                selectedOrigin: null,
                selectedRunTimeType: null,
                selectedState: null,
                lastRequestPayload: {}
            };
        },
        methods: {
            refresh: function(force) {
                this.tableStore.dispatch("fetchReportsTable", {_silent: !force});
            },
            getColor: function(status) {
                if (status === "completed") {
                    return "green";
                }
                if (status === "errored") {
                    return "red";
                }
                return "blue";
            },
            getViewText: function(row) {
                return (row.status !== "running" && row.status !== "rerunning") ? CV.i18n("common.view") : CV.i18n("taskmanager.view-old");
            },
            isReadyForView: function(row) {
                return row.view && row.hasData;
            },
            isReadyForRerun: function(row) {
                return row.status !== "running" && row.status !== "rerunning" && row.request;
            },
            handleCommand: function(command, row) {
                var id = row._id,
                    self = this;

                if (id) {
                    if (command === "delete-task") {
                        CountlyHelpers.confirm(CV.i18n("taskmanager.confirm-delete", "<b>" + row.name + "</b>"), "popStyleGreen", function(result) {
                            if (!result) {
                                return true;
                            }
                            countlyTaskManager.del(id, function() {
                                self.refresh();
                            });
                        }, [CV.i18n("common.no-dont-delete"), CV.i18n("taskmanager.yes-delete-report")], {title: CV.i18n("taskmanager.confirm-delete-title"), image: "delete-report"});
                    }
                    else if (command === "rerun-task") {
                        CountlyHelpers.confirm(CV.i18n("taskmanager.confirm-rerun"), "popStyleGreen", function(result) {
                            if (!result) {
                                return true;
                            }
                            countlyTaskManager.update(id, function(res, error) {
                                if (res.result === "Success") {
                                    countlyTaskManager.monitor(id, true);
                                    self.refresh();
                                }
                                else {
                                    CountlyHelpers.alert(error, "red");
                                }
                            });
                        }, [CV.i18n("common.no-dont-do-that"), CV.i18n("taskmanager.yes-rerun-report")], {title: CV.i18n("taskmanager.confirm-rerun-title"), image: "rerunning-task"});
                    }
                    else if (command === "view-task") {
                        if (this.disableAutoNavigationToTask) {
                            self.$emit("view-task", row);
                        }
                        else {
                            window.location = row.view + id;
                        }
                    }
                }
            },
            getExportAPI: function() {
                var requestPath = '/o/tasks/list?api_key=' + countlyGlobal.member.api_key +
                    "&app_id=" + countlyCommon.ACTIVE_APP_ID + '&iDisplayStart=0&iDisplayLength=10000',
                    self = this;

                if (this.lastRequestPayload) {
                    Object.keys(this.lastRequestPayload).forEach(function(name) {
                        switch (name) {
                        case 'query':
                            requestPath += '&' + name + '=' + encodeURI(self.lastRequestPayload[name]);
                            break;
                        default:
                            requestPath += '&' + name + '=' + self.lastRequestPayload[name];
                        }
                    });
                }
                var apiQueryData = {
                    api_key: countlyGlobal.member.api_key,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    path: requestPath,
                    method: "GET",
                    filename: "Reports" + moment().format("DD-MMM-YYYY"),
                    prop: ['aaData']
                };
                return apiQueryData;
            }
        }
    }));

    Vue.component("cly-report-manager-dialog", countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager-dialog.html'),
        components: {
            "unread-pin": UnreadPin
        },
        props: {
            origin: {
                type: String,
                default: null
            },
            disabled: {
                type: Boolean,
                default: false
            },
            disableRunningCount: {
                type: Boolean,
                default: false
            }
        },
        computed: {
            remoteOpId: function() {
                return this.$store.state.countlyTaskManager.opId;
            },
            unread: function() {
                var unread = this.$store.getters["countlyTaskManager/unreadStats"];
                if (unread[countlyCommon.ACTIVE_APP_ID]) {
                    if (this.origin) {
                        return unread[countlyCommon.ACTIVE_APP_ID][this.origin] || 0;
                    }
                    return unread[countlyCommon.ACTIVE_APP_ID]._total || 0;
                }
                return 0;
            }
        },
        data: function() {
            return {
                isDialogVisible: false,
                runningCount: 0,
                fetchingCount: false
            };
        },
        watch: {
            remoteOpId: function() {
                this.fetchRunningCount();
            },
            disabled: function(newVal) {
                if (newVal) {
                    this.isDialogVisible = false;
                }
            }
        },
        methods: {
            fetchRunningCount: function() {
                if (!this.disableRunningCount && !this.fetchingCount) {
                    var q = {
                            status: {$in: ["running", "rerunning"]},
                            manually_create: {$ne: true}
                        },
                        self = this;

                    if (this.fixedOrigin) {
                        q.type = this.fixedOrigin;
                    }
                    this.fetchingCount = true;
                    CV.$.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/tasks/count?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
                        data: {
                            query: JSON.stringify(q)
                        }
                    }, {disableAutoCatch: false})
                        .then(function(resp) {
                            self.runningCount = resp && resp[0] && resp[0].c;
                        })
                        .catch(function() {})
                        .finally(function() {
                            self.fetchingCount = false;
                        });
                }
            },
            showDialog: function() {
                if (!this.disabled) {
                    this.isDialogVisible = true;
                }
            },
            onViewTask: function(payload) {
                this.$emit("view-task", payload);
                this.isDialogVisible = false;
            }
        }
    }));

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ReportManagerView,
        });
    };

    app.route("/manage/tasks", "manageJobs", function() {
        this.renderWhenReady(getMainView());
    });
})();