/*global app, countlyVue, CV, Vue, countlyGlobal, countlyCommon, moment, CountlyHelpers, countlyTaskManager, countlyAuth */

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
                return !!(unread && unread[this.appId] && unread[this.appId][this.taskId]);
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
                    var store = this.$store,
                        taskId = this.taskId,
                        appId = this.appId;

                    setTimeout(function() {
                        store.commit("countlyTaskManager/setRead", {
                            taskId: taskId,
                            appId: appId
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
            },
            maxHeight: {
                type: String,
                default: null
            },
            testId: {
                type: String,
                default: "cly-report-manager-table-default-test-id",
                required: false
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
                else if (this.currentFilter.selectedOrigin && this.currentFilter.selectedOrigin !== "all") {
                    q.type = this.currentFilter.selectedOrigin;
                }
                if (this.currentFilter.selectedRunTimeType && this.currentFilter.selectedRunTimeType !== "all") {
                    q.autoRefresh = this.currentFilter.selectedRunTimeType === "auto-refresh";
                }
                if (this.currentFilter.selectedState && this.currentFilter.selectedState !== "all") {
                    q.status = this.currentFilter.selectedState;
                }
                if (this.currentFilter.selectedOwner && this.currentFilter.selectedOwner !== "all") {
                    q.creator = countlyGlobal.member._id;
                }
                return q;
            },
            remoteOpId: function() {
                return this.$store.state.countlyTaskManager.opId;
            },
            filterSummary: function() {
                let filters = [
                    this.availableStates[this.currentFilter.selectedState],
                    this.availableOwners[this.currentFilter.selectedOwner],
                    this.availableDataSources[this.currentFilter.selectedDataSource]
                ];
                if (!this.fixedOrigin) {
                    filters.splice(0, 0, this.availableOrigins[this.currentFilter.selectedOrigin]);
                }
                if (this.isManual) {
                    filters.push(this.availableRunTimeTypes[this.currentFilter.selectedRunTimeType]);
                }
                return filters.join(", ");
            },
            availableDataSources: function() {
                var obj = {
                    "all": CV.i18n("report-manager.all-sources"),
                    "independent": CV.i18n("report-manager.app-independent")
                };
                if (countlyGlobal.apps && Object.keys(countlyGlobal.apps).length !== 0) {
                    const globalApps = Object.values(countlyGlobal.apps)
                        .sort(function(a, b) {
                            const aLabel = a?.label || '';
                            const bLabel = b?.label || '';
                            const locale = countlyCommon.BROWSER_LANG || 'en';

                            if (aLabel && bLabel) {
                                return aLabel.localeCompare(bLabel, locale, { numeric: true }) || 0;
                            }

                            // Move items with no label to the end
                            if (!aLabel && bLabel) {
                                return 1;
                            }

                            if (aLabel && !bLabel) {
                                return -1;
                            }

                            return 0;
                        });

                    for (var app of globalApps) {
                        obj[app._id] = app.name;
                    }
                }
                return obj;
            },
            selectedAppId: function() {
                return (this.currentFilter.selectedDataSource && ["all", "independent"].includes(this.currentFilter.selectedDataSource))
                    ? countlyCommon.ACTIVE_APP_ID
                    : this.currentFilter.selectedDataSource;
            },
            dataSource: function() {
                if (this.currentFilter.selectedDataSource && ["all", "independent"].includes(this.currentFilter.selectedDataSource)) {
                    return this.currentFilter.selectedDataSource;
                }
            }
        },
        watch: {
            "query": function() {
                this.refresh(true);
            },
            remoteOpId: function() {
                this.refresh(true);
            }
        },
        data: function() {
            var self = this;
            var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("reportsTable", {
                columns: ['report_name', '_placeholder0', 'status', 'type', "_placeholder1", "_placeholder2", "_placeholder3", 'end', 'start'],
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
                        url: countlyCommon.API_PARTS.data.r + "/tasks/list",
                        data: {
                            app_id: self.selectedAppId,
                            data_source: self.dataSource,
                            query: JSON.stringify(queryObject),
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
                                if (row.subtasks[k].status === "errored" || row.subtasks[k].status === "running" || row.subtasks[k].status === "rerunning") {
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
                    "all": CV.i18n("report-manager.all-origins"),
                    "funnels": CV.i18n("sidebar.funnels") || "Funnels",
                    "drill": CV.i18n("drill.drill") || "Drill",
                    "retention": CV.i18n("retention.retention") || "Retention",
                    "formulas": CV.i18n("calculated-metrics.formulas") || "Formulas",
                    "dbviewer": CV.i18n("dbviewer.title") || "DBViewer",
                    "data-manager": CV.i18n("data-manager.plugin-title") || "Data Manager",
                    "views": CV.i18n("views.title") || "Views"
                },
                availableRunTimeTypes: {
                    "all": CV.i18n("report-manager.all-types"),
                    "auto-refresh": CV.i18n("taskmanager.auto"),
                    "none-auto-refresh": CV.i18n("taskmanager.manual")
                },
                availableStates: {
                    "all": CV.i18n("report-manager.all-statuses"),
                    "running": CV.i18n("common.running"),
                    "rerunning": CV.i18n("taskmanager.rerunning"),
                    "stopped": CV.i18n("common.stopped"),
                    "completed": CV.i18n("common.completed"),
                    "errored": CV.i18n("common.errored")
                },
                availableOwners: {
                    "all": CV.i18n("report-manager.all-owners"),
                    "me": CV.i18n("report-manager.my-reports")
                },
                currentFilter: {
                    selectedOrigin: "all",
                    selectedRunTimeType: "all",
                    selectedState: "all",
                    selectedOwner: "all",
                    selectedDataSource: "all"
                },
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
            isDownloadable: function(row) {
                return ["views", "dbviewer", "tableExport"].includes(row.type);
            },
            isReadyForView: function(row) {
                if (row.linked_to) {
                    if (row.have_dashboard_widget) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                else {
                    return row.view && row.hasData;
                }
            },
            isReadyForRerun: function(row) {
                return (row.type && row.type !== "profile group") && row.status !== "running" && row.status !== "rerunning" && row.request;
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
                            countlyTaskManager.del(id, function(res, error) {
                                if (res.result === "Success") {
                                    self.refresh();
                                }
                                else {
                                    CountlyHelpers.alert(error, "red");
                                }
                            });
                        }, [CV.i18n("common.no-dont-delete"), CV.i18n("taskmanager.yes-delete-report")], {title: CV.i18n("taskmanager.confirm-delete-title"), image: "delete-report"});
                    }
                    else if (command === "rerun-task") {
                        CountlyHelpers.confirm(CV.i18n("taskmanager.confirm-rerun"), "popStyleGreen", function(result) {
                            if (!result) {
                                return true;
                            }
                            self.refresh();
                            countlyTaskManager.update(id, function(res, error) {
                                if (res.result === "Success") {
                                    countlyTaskManager.monitor(id, true);
                                    self.refresh();
                                }
                                else {
                                    CountlyHelpers.alert(error, "red");
                                }
                            });
                        }, [CV.i18n("common.no-dont-do-that"), CV.i18n("taskmanager.yes-rerun-task")], {title: CV.i18n("taskmanager.confirm-rerun-title"), image: "rerunning-task"});
                    }
                    else if (command === "view-task") {
                        self.$emit("view-task", row);
                        if (!this.disableAutoNavigationToTask) {
                            if (row.dashboard_report || row.type === "profile group") {
                                window.location = row.view;
                            }
                            else {
                                window.location = row.view + id;
                            }
                        }
                    }
                    else if (command === "download-task") {
                        self.$emit("download-task", row);
                        var app_id = row.app_id && row.app_id !== "undefined" ? row.app_id : countlyCommon.ACTIVE_APP_ID;
                        var link = countlyCommon.API_PARTS.data.r + '/export/download/' + row._id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + app_id;
                        window.location = link;
                    }
                }
            },
            getExportAPI: function() {
                var requestPath = '/o/tasks/list?api_key=' + countlyGlobal.member.api_key + '&iDisplayStart=0&iDisplayLength=10000',
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
            },
            handleSubmitFilter: function(newFilter) {
                this.currentFilter = newFilter;
                this.$refs.filterDropdown.doClose();
            },
            handleReloadFilter: function() {
                //this.$refs.filterDropdown.reload();
            },
            handleResetFilter: function() {
                this.currentFilter = {
                    selectedOrigin: "all",
                    selectedRunTimeType: "all",
                    selectedState: "all",
                    selectedOwner: "all",
                    selectedDataSource: "all"
                };
            },
            handleCancelFilter: function() {
                this.$refs.filterDropdown.doClose();
                //this.handleReloadFilter();
            }
        },
        created: function() {
            var filteredOrigins = {};
            for (var key in this.availableOrigins) {
                var isValid = countlyGlobal.plugins.includes(key) || key === "all";

                if (key === "retention" && countlyGlobal.plugins.includes("retention_segments")) {
                    isValid = true;
                }

                if (isValid) {
                    filteredOrigins[key] = this.availableOrigins[key];
                }
            }
            this.availableOrigins = filteredOrigins;
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
            },
            disableAutoNavigationToTask: {
                type: Boolean,
                default: true
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
        mounted: function() {
            this.refresh();
        },
        watch: {
            remoteOpId: function() {
                this.refresh();
            },
            disabled: function(newVal) {
                if (newVal) {
                    this.isDialogVisible = false;
                }
            }
        },
        methods: {
            refresh: function() {
                this.fetchRunningCount();
            },
            fetchRunningCount: function() {
                if (!this.disableRunningCount && !this.fetchingCount) {
                    var q = {
                            status: {$in: ["running", "rerunning"]},
                            manually_create: {$ne: true}
                        },
                        self = this;

                    if (this.origin) {
                        q.type = this.origin;
                    }
                    this.fetchingCount = true;
                    CV.$.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/tasks/count?app_id=" + countlyCommon.ACTIVE_APP_ID,
                        data: {
                            query: JSON.stringify(q)
                        }
                    }, {disableAutoCatch: false})
                        .then(function(resp) {
                            self.runningCount = (resp && resp[0] && resp[0].c) || 0;
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
        if (countlyAuth.validateRead("reports")) {
            this.renderWhenReady(getMainView());
        }
        else {
            app.navigate("/", true);
        }
    });
})();
