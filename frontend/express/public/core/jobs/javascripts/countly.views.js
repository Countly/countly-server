/*global countlyAuth, countlyCommon, app, countlyVue, CV, countlyGlobal, CountlyHelpers, $, moment */

(function() {
    /**
     * Helper function to map the job status to a color tag
     * @param {Object} row The job row object
     * @returns {string} Color code for the status
     */
    var getColor = function(row) {
        // row is the merged job object
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
        return "gray";
    };

    /**
     * Helper to update row display fields (like nextRunDate, nextRunTime, lastRun)
     * @param {Object} row The job row object to update
     * @returns {void}
     */
    var updateScheduleRow = function(row) {
        row.nextRunDate = row.nextRunAt ? moment(row.nextRunAt).format('YYYY-MM-DD') : '';
        row.nextRunTime = row.nextRunAt ? moment(row.nextRunAt).format('HH:mm:ss') : '';
        row.lastRun = row.lastFinishedAt ? moment(row.lastFinishedAt).fromNow() : '';

        // If the row has .config.defaultConfig.schedule.value, use it as its "default schedule"
        if (row.config && row.config.defaultConfig && row.config.defaultConfig.schedule) {
            row.schedule = row.config.defaultConfig.schedule.value;
            row.configuredSchedule = row.config.schedule;
            row.scheduleOverridden = row.configuredSchedule && (row.configuredSchedule !== row.schedule);
        }
    };

    /**
     * Main view for listing jobs
     */
    var JobsView = countlyVue.views.create({
        template: CV.T('/core/jobs/templates/jobs.html'), // your HTML template path
        data: function() {
            var self = this;

            // Create a local vuex store for the server data table
            var tableStore = countlyVue.vuex.getLocalStore(
                countlyVue.vuex.ServerDataTable("jobsTable", {
                    // columns: ['name', "schedule", "next", "finished", "status", "total"],
                    columns: [
                        "name",
                        "status",
                        "scheduleLabel",
                        "nextRunAt",
                        "lastFinishedAt",
                        "lastRunStatus",
                        "total"
                    ],

                    onRequest: function() {
                        // Called before making the request
                        self.loaded = false;
                        return {
                            type: "GET",
                            url: countlyCommon.API_URL + "/o/jobs", // no ?name= param => list mode
                            data: {
                                app_id: countlyCommon.ACTIVE_APP_ID,
                                iDisplayStart: 0,
                                iDisplayLength: 50
                            }
                        };
                    },
                    onReady: function(context, rows) {
                        // Called when request completes successfully
                        self.loaded = true;

                        // rows.aaData is an array: [ { job: {...}, config: {...} }, ... ]
                        // We merge job + config into a single row object
                        var processedRows = [];
                        for (var i = 0; i < rows.length; i++) {
                            var mergedJob = rows[i].job; // from "job"
                            var config = rows[i].config; // from "config"

                            mergedJob.enabled = config.enabled;
                            mergedJob.config = config;

                            // Do any schedule display updates, etc.
                            updateScheduleRow(mergedJob);

                            processedRows.push(mergedJob);
                        }
                        return processedRows;
                    }
                })
            );

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
            /**
             * Whether the current user can enable/disable jobs
             * @returns {boolean} True if user has admin rights
             */
            canSuspendJob: function() {
                return countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID];
            },
        },
        methods: {
            formatDateTime: function(date) {
                return date ? moment(date).format('D MMM, YYYY HH:mm:ss') : '-';
            },
            getStatusColor: function(details) {
                // Not strictly used in the listing, but you can keep it for reference
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
                // For run status
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
            /**
             * Navigates to job details page
             * @param {Object} row The job row to navigate to
             * @returns {void}
             */
            goTo: function(row) {
                app.navigate("#/manage/jobs/" + row.name, true);
            },
            getColor: getColor,
            /**
             * Called from the row's more options, e.g. "enable", "disable", "schedule", "runNow"
             * @param {string} command The command to execute
             * @param {Object} row The job row
             * @returns {void}
             */
            handleCommand: function(command, row) {
                if (row.name) {
                    var self = this;
                    if (command === 'schedule') {
                        // Show the schedule dialog
                        this.selectedJobConfig = {
                            name: row.name,
                            schedule: row.configuredSchedule || row.schedule,
                            defaultSchedule: row.schedule,
                            enabled: row.enabled
                        };
                        this.scheduleDialogVisible = true;
                        return;
                    }

                    // For enable, disable, runNow, etc. => /i/jobs
                    var data = {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        jobName: row.name,
                        action: command
                    };

                    $.ajax({
                        type: "GET", // or POST if your server expects that
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
            /**
             * Called when user clicks "Save" on the schedule dialog
             */
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

    /**
     * Detailed view for a single job
     */
    var JobDetailsView = countlyVue.views.BaseView.extend({
        template: "#jobs-details-template",
        data: function() {
            return {
                job_name: this.$route.params.jobName,
                jobDetails: null,
                jobRuns: [],
                isLoading: false,
                // columns for the run history table
                jobRunColumns: [
                    { prop: "lastRunAt", label: CV.i18n('jobs.run-time'), sortable: true },
                    { prop: "status", label: CV.i18n('jobs.status'), sortable: true },
                    { prop: "duration", label: CV.i18n('jobs.duration'), sortable: true },
                    { prop: "result", label: CV.i18n('jobs.result') }
                ]
            };
        },
        computed: {
            /**
             * Check if there are any scheduleOverride or retryOverride in the config
             * @returns {boolean} True if overrides exist
             */
            hasOverrides: function() {
                return this.jobDetails &&
                    (this.jobDetails.config?.scheduleOverride ||
                        this.jobDetails.config?.retryOverride);
            }
        },
        methods: {
            /**
             * Fetches jobDetails + normal docs from /o/jobs?name=<jobName>
             */
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
                        // jobDetails => the main scheduled doc + overrides
                        self.jobDetails = response.jobDetails;

                        // aaData => the array of normal run docs
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
                // (optional) if you want dynamic calculations
                if (!run.lastRunAt || !run.lastFinishedAt) {
                    return '-';
                }
                return ((new Date(run.lastFinishedAt) - new Date(run.lastRunAt)) / 1000).toFixed(2);
            },
            /**
             * Map jobDetails.currentState.status to a color
             * @param {Object} jobDetails The job details object
             * @returns {string} Color code for the status
             */
            getStatusColor: function(jobDetails) {
                if (!jobDetails.config?.enabled) {
                    return "grey";
                }
                switch (jobDetails.currentState.status) {
                case "RUNNING": return "blue";
                case "FAILED": return "red";
                case "COMPLETED": return "green";
                default: return "yellow";
                }
            },
            /**
             * Map each run's status to a color
             * @param {Object} run The job run object
             * @returns {string} Color code for the status
             */
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
            // On load, fetch data
            this.fetchJobDetails();
        }
    });

    /**
     * Wrap the JobsView as a Countly Backbone view
     * @returns {Object} Backbone wrapper view
     */
    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: JobsView,
            vuex: [] // empty array if none
        });
    };

    /**
     * Define routes for #/manage/jobs and #/manage/jobs/:jobName
     */
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
