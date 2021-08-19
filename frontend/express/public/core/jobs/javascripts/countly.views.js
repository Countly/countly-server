/*global countlyAuth, countlyCommon, app, countlyVue, CV */

(function() {
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
                        row.nextRun = countlyCommon.getDate(row.next) + " " + countlyCommon.getTime(row.next);
                        row.lastRun = countlyCommon.formatTimeAgo(row.finished);
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
        methods: {
            refresh: function(force) {
                if (this.loaded || force) {
                    this.loaded = false;
                    this.tableStore.dispatch("fetchJobsTable");
                }
            },
            goTo: function(row) {
                app.navigate("#/manage/jobs/" + row.name, true);
            }
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
                        row.nextRun = countlyCommon.getDate(row.next) + " " + countlyCommon.getTime(row.next);
                        row.lastRun = countlyCommon.formatTimeAgo(row.finished);
                        row.dataAsString = JSON.stringify(row.data, null, 2);
                        row.durationInSeconds = (row.duration / 1000) + 's';
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
            }
        }
    });

    //register views
    app.jobsView = new countlyVue.views.BackboneWrapper({
        component: JobsView,
        vuex: [] //empty array if none
    });

    //register views
    app.jobDetailView = new countlyVue.views.BackboneWrapper({
        component: JobDetailView,
        vuex: [] //empty array if none
    });

    if (countlyAuth.validateRead('global_jobs')) {
        app.route("/manage/jobs", "manageJobs", function() {
            this.renderWhenReady(this.jobsView);
        });

        app.route("/manage/jobs/:name", "manageJobName", function(name) {
            this.jobDetailView.params = {job_name: name};
            this.renderWhenReady(this.jobDetailView);
        });
    }
})();