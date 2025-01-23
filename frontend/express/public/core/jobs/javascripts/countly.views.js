/*global countlyAuth, countlyCommon, app, countlyVue, CV, countlyGlobal, CountlyHelpers, $, moment */

(function() {
    var getColor = function(row) {
        if (row.status === "RUNNING") {
            return "green";
        }
        else if (row.status === "SCHEDULED" && row.enabled) {
            return "yellow";
        }
        else if (row.status === "SUSPENDED" || !row.enabled) {
            return "gray";
        }
        else if (row.status === "CANCELLED" || row.lastRunStatus === "failed") {
            return "red";
        }
    };
    var updateScheduleRow = function(row) {
        // Format dates using moment
        row.nextRunDate = row.nextRunAt ? moment(row.nextRunAt).format('YYYY-MM-DD') : '';
        row.nextRunTime = row.nextRunAt ? moment(row.nextRunAt).format('HH:mm:ss') : '';
        row.lastRun = row.lastFinishedAt ? moment(row.lastFinishedAt).fromNow() : '';

        // Handle schedule display
        if (row.config && row.config.defaultConfig && row.config.defaultConfig.schedule) {
            row.schedule = row.config.defaultConfig.schedule.value;
            row.configuredSchedule = row.config.schedule;
            row.scheduleOverridden = row.configuredSchedule &&
                                    row.configuredSchedule !== row.schedule;
        }

    };
    var JobsView = countlyVue.views.create({
        template: CV.T('/core/jobs/templates/jobs.html'),
        data: function() {
            var self = this;
            var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("jobsTable", {
                columns: ['name', "schedule", "next", "finished", "status", "total"],
                onRequest: function() {
                    self.loaded = false;
                    return {
                        type: "GET",
                        url: countlyCommon.API_URL + "/o/jobs",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            iDisplayStart: 0,
                            iDisplayLength: 50
                        }
                    };
                },
                onReady: function(context, rows) {
                    self.loaded = true;
                    var processedRows = [];
                    for (var i = 0; i < rows.aaData.length; i++) {
                        var row = rows.aaData[i].job;
                        var config = rows.aaData[i].config;

                        // Process job status - now directly from API
                        row.enabled = config.enabled;
                        row.config = config;

                        // Schedule handling
                        row.schedule = config.schedule;
                        row.scheduleLabel = row.scheduleLabel || '';

                        updateScheduleRow(row);
                        processedRows.push(row);
                    }
                    return processedRows;
                }
            }));
            return {
                loaded: true,
                saving: false,
                scheduleDialogVisible: false,
                selectedJobConfig: {
                    name: '',
                    schedule: '',
                    defaultSchedule: '',
                    scheduleLabel: '',
                    enabled: true
                },
                tableStore: tableStore,
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "jobsTable")
            };
        },
        computed: {
            canSuspendJob: function() {
                return countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID];
            },
        },
        methods: {
            formatDateTime(date) {
                return date ? moment(date).format('D MMM, YYYY HH:mm:ss') : '-';
            },
            getStatusColor(details) {
                if (!details.config.enabled) {
                    return 'gray';
                }
                if (details.currentState.status === 'RUNNING') {
                    return 'blue';
                }
                if (details.currentState.status === 'FAILED') {
                    return 'red';
                }
                if (details.currentState.status === 'COMPLETED') {
                    return 'green';
                }
                return 'yellow';
            },
            getRunStatusColor(status) {
                if (status === 'success') {
                    return 'green';
                }
                if (status === 'failed') {
                    return 'red';
                }
                return 'gray';
            },
            refresh: function(force) {
                if (this.loaded || force) {
                    this.loaded = false;
                    this.tableStore.dispatch("fetchJobsTable");
                }
            },
            goTo: function(row) {
                app.navigate("#/manage/jobs/" + row.name, true);
            },
            getColor: getColor,
            handleCommand: function(command, row) {
                if (row.name) {
                    var self = this;
                    if (command === 'schedule') {
                        this.selectedJobConfig = {
                            name: row.name,
                            schedule: row.configuredSchedule || row.schedule,
                            defaultSchedule: row.schedule,
                            enabled: row.enabled
                        };
                        this.scheduleDialogVisible = true;
                        return;
                    }

                    var data = {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        jobName: row.name,
                        action: command
                    };

                    // You can switch to type: "POST" if desired;
                    // server code accepts query params so GET also works.
                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + "/i/jobs",
                        data: data,
                        success: function(res) {
                            if (res.result === "Success") {
                                self.refresh(true);
                                CountlyHelpers.notify({
                                    type: "ok",
                                    message: CV.i18n("jobs." + command + "-success")
                                });
                            }
                            else {
                                CountlyHelpers.notify({
                                    type: "error",
                                    message: res.result
                                });
                            }
                        },
                        error: function(err) {
                            CountlyHelpers.notify({
                                type: "error",
                                message: err.responseJSON?.result || "Error"
                            });
                        }
                    });
                }
            },
            saveSchedule: function() {
                var self = this;
                self.saving = true;

                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/i/jobs",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        jobName: this.selectedJobConfig.name,
                        action: 'updateSchedule',
                        schedule: this.selectedJobConfig.schedule
                    },
                    success: function() {
                        self.saving = false;
                        self.scheduleDialogVisible = false;
                        self.refresh(true);
                        CountlyHelpers.notify({
                            type: "ok",
                            message: CV.i18n("jobs.schedule-updated")
                        });
                    },
                    error: function(err) {
                        self.saving = false;
                        CountlyHelpers.notify({
                            type: "error",
                            message: err.responseJSON?.result || "Error"
                        });
                    }
                });
            },
        }
    });

    var JobDetailsView = countlyVue.views.BaseView.extend({
        template: "#jobs-details-template",
        data: function() {
            return {
                job_name: this.$route.params.jobName,
                jobDetails: null,
                jobRuns: [],
                isLoading: false,
                jobRunColumns: [
                    { prop: "lastRunAt", label: CV.i18n('jobs.run-time'), sortable: true },
                    { prop: "status", label: CV.i18n('jobs.status'), sortable: true },
                    { prop: "duration", label: CV.i18n('jobs.duration'), sortable: true },
                    { prop: "result", label: CV.i18n('jobs.result') }
                ]
            };
        },
        computed: {
            hasOverrides: function() {
                return this.jobDetails &&
                       (this.jobDetails.config.scheduleOverride ||
                        this.jobDetails.config.retryOverride);
            }
        },
        methods: {
            fetchJobDetails: function() {
                var self = this;
                self.isLoading = true;

                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/jobs",
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "name": self.job_name,
                        "iDisplayStart": 0,
                        "iDisplayLength": 50
                    },
                    dataType: "json",
                    success: function(response) {
                        // API now returns jobDetails directly
                        self.jobDetails = response.jobDetails;

                        // Process job runs from aaData
                        self.jobRuns = (response.aaData || []).map(function(run) {
                            return {
                                lastRunAt: run.lastRunAt,
                                status: run.status,
                                duration: run.duration,
                                result: run.result,
                                failReason: run.failReason,
                                dataAsString: run.dataAsString
                            };
                        });

                        self.isLoading = false;
                    },
                    error: function() {
                        self.isLoading = false;
                        CountlyHelpers.notify({
                            title: CV.i18n("common.error"),
                            message: CV.i18n("jobs.details-fetch-error"),
                            type: "error"
                        });
                    }
                });
            },
            formatDateTime: function(date) {
                return date ? moment(date).format('D MMM, YYYY HH:mm:ss') : '-';
            },
            calculateDuration: function(run) {
                if (!run.lastRunAt || !run.lastFinishedAt) {
                    return '-';
                }
                return ((new Date(run.lastFinishedAt) - new Date(run.lastRunAt)) / 1000).toFixed(2);
            },
            getStatusColor: function(jobDetails) {
                if (!jobDetails.config.enabled) {
                    return "grey";
                }
                switch (jobDetails.currentState.status) {
                case "RUNNING": return "blue";
                case "FAILED": return "red";
                case "COMPLETED": return "green";
                default: return "yellow";
                }
            },
            getRunStatusColor: function(run) {
                switch (run.status) {
                case "success": return "green";
                case "failed": return "red";
                case "running": return "blue";
                default: return "yellow";
                }
            }
        },
        mounted: function() {
            this.fetchJobDetails();
        }
    });

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: JobsView,
            vuex: [] //empty array if none
        });
    };

    var getDetailedView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: JobDetailsView,
            vuex: [] //empty array if none
        });
    };

    if (countlyAuth.validateGlobalAdmin()) {
        app.route("/manage/jobs", "manageJobs", function() {
            this.renderWhenReady(getMainView());
        });

        app.route("/manage/jobs/:jobName", 'jobs-details', function(jobName) {
            var jobDetailsView = new countlyVue.views.BackboneWrapper({
                component: JobDetailsView,
                templates: [
                    {
                        namespace: "jobs",
                        mapping: {
                            "details-template": "/core/jobs/templates/jobs-details.html"
                        }
                    }
                ]
            });
            jobDetailsView.params = { jobName: jobName };
            this.renderWhenReady(jobDetailsView);
        });
    }
})();