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

    Vue.component("cly-report-manager-table", countlyVue.views.create({
        template: CV.T('/core/report-manager/templates/reportmanager-table.html'),
        mixins: [countlyVue.mixins.commonFormatters],
        props: {
            "report-type": {
                type: String,
                default: "manual"
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
                if (this.selectedOrigin && this.selectedOrigin !== "all") {
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
                onError: function(context, err) {
                    throw err;
                },
                onReady: function(context, rows) {
                    rows.forEach(function(row) {
                        var processSubtasks = function() {
                            if (row.taskgroup && row.subtasks) {
                                var difStats = false;
                                var stat = "completed";
                                var dd = "";

                                for (var k in row.subtasks) {
                                    if (row.subtasks[k].status !== stat) {
                                        difStats = true;
                                    }
                                    var color = "green";
                                    if (row.subtasks[k].status === "errored") {
                                        color = "red";
                                    }
                                    if (row.subtasks[k].status === "running" || row.subtasks[k].status === "rerunning") {
                                        color = "blue";
                                    }
                                    if (row.subtasks[k].errormsg) {
                                        dd += "<div class='have_error_message table_status_dot table_status_dot_" + color + "'><span >" + "</span>" + row.subtasks[k].status + "<p class='error_message_div'>" + row.subtasks[k].errormsg + "</div></div>";
                                    }
                                    else {
                                        dd += "<div class='table_status_dot table_status_dot_" + color + "'><span >" + "</span>" + row.subtasks[k].status + "</div>";
                                    }

                                }
                                if (difStats) {
                                    return dd;
                                }
                                else {
                                    if (row.errormsg && row.status === "errored") {
                                        return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.availableStates[row.status] || row.status) + "<p class='error_message_div'>" + row.errormsg + "</p></span>";
                                    }
                                    else {
                                        return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.availableStates[row.status] || row.status) + "</span>";
                                    }
                                }
                            }
                            else {
                                if (row.errormsg) {
                                    return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.availableStates[row.status] || row.status) + "<p class='error_message_div'>" + row.errormsg + "</p></span>";
                                }
                                else {
                                    return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.availableStates[row.status] || row.status) + "</span>";
                                }
                            }
                        };
                        var processTime = function() {
                            var time = 0;
                            if (row.taskgroup && row.subtasks) {
                                for (var k in row.subtasks) {
                                    if (row.subtasks[k].status === "running" || row.subtasks[k].status === "rerunning") {
                                        row.status = row.subtasks[k].status;
                                        row.start = row.subtasks[k].start || row.start;
                                    }
                                    if (row.end < row.subtasks[k].end) {
                                        row.end = row.subtasks[k].end;
                                    }
                                }
                            }
                            if (row.status === "running" || row.status === "rerunning") {
                                time = Math.max(new Date().getTime() - row.start, 0);
                            }
                            else if (row.end && row.end > row.start) {
                                time = row.end - row.start;
                            }
                            return countlyCommon.formatTime(Math.round(time / 1000));
                        };
                        row.subtaskDesc = processSubtasks();
                        row.duration = processTime();
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
                selectedState: null
            };
        },
        methods: {
            refresh: function(force) {
                this.tableStore.dispatch("fetchReportsTable", {_silent: !force});
            },
            getStatusColor: function(status) {
                if (status === "completed") {
                    return "#2FA732";
                }
                if (status === "errored") {
                    return "#D63E40";
                }
                return "#E98010";
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
                        window.location = row.view + id;
                    }
                }
            },
            getExportAPI: function() {
                var requestPath = '/o/tasks/list?api_key=' + countlyGlobal.member.api_key +
                    "&app_id=" + countlyCommon.ACTIVE_APP_ID;
                if (this._cachedAoData) {
                    for (var i = 0; i < this._cachedAoData.length; i++) {
                        var item = this._cachedAoData[i];
                        switch (item.name) {
                        case 'iDisplayStart':
                            requestPath += '&' + item.name + '=0';
                            break;
                        case 'iDisplayLength':
                            requestPath += '&' + item.name + '=10000';
                            break;
                        case 'query':
                            requestPath += '&' + item.name + '=' + encodeURI(item.value);
                            break;
                        default:
                            requestPath += '&' + item.name + '=' + item.value;
                        }
                    }
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
            /*
            addErrorTooltips: function() {
                $("#data-table").on('mouseenter mouseleave', ".have_error_message", function() {
                    $('.have_error_message span').not(".tooltipstered").tooltipster({
                        animation: "fade",
                        animationDuration: 50,
                        delay: 100,
                        theme: 'tooltipster-borderless',
                        side: ['top'],
                        maxWidth: 500,
                        trigger: 'click',
                        interactive: true,
                        functionBefore: function(instance, helper) {
                            instance.content($(helper.origin).parent().find(".error_message_div").html());
                        },
                        contentAsHTML: true,
                        functionInit: function(instance, helper) {
                            instance.content($(helper.origin).parent().find(".error_message_div").html());
                        }
                    });

                });
                $("#data-table").on('click', ".have_error_message", function(e) {
                    if ($(e.target).hasClass('have_error_message')) {
                        $(this).find('span').trigger("click");
                    }
                });
            }
            */
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