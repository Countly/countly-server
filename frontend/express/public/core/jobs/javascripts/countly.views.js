/*global countlyAuth, countlyCommon, app, countlyVue, CV, countlyGlobal, CountlyHelpers, $ */

(function() {
    var getColor = function(row) {
        if (row.status === "SCHEDULED") {
            return "yellow";
        }
        else if (row.status === "SUSPENDED") {
            return "gray";
        }
        else if (row.status === "CANCELLED") {
            return "red";
        }
        else if (row.status === "RUNNING") {
            return "green";
        }
    };
    var updateScheduleRow = function(row) {
        var index;
        row.nextRunDate = countlyCommon.getDate(row.next);
        row.nextRunTime = countlyCommon.getTime(row.next);
        row.lastRun = countlyCommon.formatTimeAgo(row.finished);
        row.scheduleLabel = row.schedule;
        index = row.schedule.indexOf("starting on");
        if (index > (-1)) {
            row.scheduleLabel = row.schedule.substring(0, index).trim();
            row.scheduleDetail = row.schedule.substring(index).trim();
        }
        if (row.schedule.startsWith("at")) {
            index = row.schedule.indexOf("every");
            row.scheduleDetail = row.schedule.substring(0, index).trim();
            row.scheduleLabel = row.schedule.substring(index).trim();
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
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'jobs'
                        }
                    };
                },
                onReady: function(context, rows) {
                    self.loaded = true;
                    var row;
                    for (var i = 0; i < rows.length; i++) {
                        row = rows[i];
                        updateScheduleRow(row);
                    }
                    return rows;
                }
            }));
            return {
                loaded: true,
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
                if (row.rowId) {
                    var self = this;
                    if (command === "change-job-status") {
                        const suspend = row.status !== "SUSPENDED" ? true : false;
                        const data = {id: row.rowId, app_id: countlyCommon.ACTIVE_APP_ID, method: 'suspend_job', suspend: suspend};
                        var notifyType = "ok";
                        $.ajax({
                            type: "POST",
                            url: countlyCommon.API_URL + "/o",
                            data: JSON.stringify(data),
                            contentType: "application/json",
                            success: function(res) {
                                if (res.result) {
                                    self.refresh(true);
                                }
                                else {
                                    notifyType = "error";
                                }
                                CountlyHelpers.notify({
                                    type: notifyType,
                                    message: res.message
                                });
                            },
                            error: function(err) {
                                CountlyHelpers.notify({
                                    type: "error",
                                    message: err.responseJSON.error
                                });
                            }
                        });
                    }
                }
            },
        }
    });

    var JobDetailView = countlyVue.views.create({
        template: CV.T('/core/jobs/templates/jobs-details.html'),
        data: function() {
            var self = this;
            var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("jobsTable", {
                columns: ['name', "schedule", "next", "finished", "status", "total"],
                onRequest: function() {
                    self.loaded = false;
                    return {
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'jobs',
                            name: self.job_name
                        }
                    };
                },
                onReady: function(context, rows) {
                    self.loaded = true;
                    var row;
                    for (var i = 0; i < rows.length; i++) {
                        row = rows[i];
                        row.dataAsString = JSON.stringify(row.data, null, 2);
                        row.durationInSeconds = (row.duration / 1000) + 's';
                        updateScheduleRow(row);
                    }
                    return rows;
                }
            }));
            return {
                job_name: this.$route.params.job_name,
                loaded: true,
                tableStore: tableStore,
                remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "jobsTable")
            };
        },
        methods: {
            refresh: function(force) {
                if (this.loaded || force) {
                    this.loaded = false;
                    this.tableStore.dispatch("fetchJobsTable");
                }
            },
            navigate: function(id) {
                app.navigate("#/manage/jobs/" + id);
            },
            getColor: getColor
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
            component: JobDetailView,
            vuex: [] //empty array if none
        });
    };

    if (countlyAuth.validateGlobalAdmin()) {
        app.route("/manage/jobs", "manageJobs", function() {
            this.renderWhenReady(getMainView());
        });

        app.route("/manage/jobs/:name", "manageJobName", function(name) {
            var view = getDetailedView();
            view.params = {job_name: name};
            this.renderWhenReady(view);
        });
    }
})();