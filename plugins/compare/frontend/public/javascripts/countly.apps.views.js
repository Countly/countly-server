/* global countlyVue, countlyCompareApps, countlyCommon, CV, countlyAuth, countlyCommon, app*/
(function() {
    var FEATURE_NAME = "compare";
    var CompareAppsTable = countlyVue.views.create({
        template: CV.T("/compare/templates/compareAppsTable.html"),
        mixins: [countlyVue.mixins.i18n],
        data: function() {
            return {
                scoreTableExportSettings: {
                    title: "CompareApps",
                    timeDependent: true,
                }
            };
        },
        updated: function() {
            this.$refs.compareApps.$refs.elTable.clearSelection();
            var self = this;
            this.$store.getters["countlyCompareApps/tableRows"]
                .map(function(row) {
                    if (row.checked) {
                        self.$refs.compareApps.$refs.elTable.toggleRowSelection(row, true);
                    }
                    else {
                        self.$refs.compareApps.$refs.elTable.toggleRowSelection(row, false);
                    }
                });
        },
        computed: {
            appsTableRows: function() {
                return this.$store.getters["countlyCompareApps/tableRows"];
            }
        },
        methods: {
            handleCurrentChange: function(selection) {
                var selectedApps = [];
                selection.forEach(function(item) {
                    selectedApps.push(item.id);
                });
                this.$store.dispatch('countlyCompareApps/updateTableStateMap', selection);
                this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                this.$store.dispatch('countlyCompareApps/fetchLegendData', selectedApps);
            },
            handleAllChange: function(selection) {
                var selectedApps = [];
                selection.forEach(function(item) {
                    selectedApps.push(item.id);
                });
                this.$store.dispatch('countlyCompareApps/updateTableStateMap', selection);
                this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                this.$store.dispatch('countlyCompareApps/fetchLegendData', selectedApps);
            }
        },
    });
    var CompareApps = countlyVue.views.create({
        template: CV.T("/compare/templates/compareApps.html"),
        components: {
            "detail-tables": CompareAppsTable,
        },
        methods: {
            compareApps: function() {
                this.$store.dispatch('countlyCompareApps/setSelectedApps', this.value);
                this.$store.dispatch('countlyCompareApps/fetchCompareAppsData');
            }
        },
        computed: {
            allCompareAppsList: function() {
                return this.$store.getters["countlyCommon/getAllApps"];
            },
            lineChartData: function() {
                return this.$store.getters["countlyCompareApps/lineChartData"];
            },
            lineLegend: function() {
                return this.$store.getters["countlyCompareApps/lineLegend"];
            },
            selectedDatePeriod: {
                get: function() {
                    return this.$store.getters["countlyCompareApps/selectedDatePeriod"];
                },
                set: function(period) {
                    this.$store.dispatch('countlyCompareApps/setSelectedDatePeriod', period);
                    countlyCommon.setPeriod(period);
                    this.$store.dispatch('countlyCompareApps/fetchCompareAppsData');
                }
            },
            selectedGraph: {
                get: function() {
                    var self = this;
                    if (self.selectedMetric === "totalSessions") {
                        return this.i18n("apps.compare.results.by.total.sessions");
                    }
                    else if (self.selectedMetric === "totalVisitors") {
                        return this.i18n("apps.compare.results.by.total.visitors");
                    }
                    else if (self.selectedMetric === "newVisitors") {
                        return this.i18n("apps.compare.results.by.new.visitors");
                    }
                    else if (self.selectedMetric === "timeSpent") {
                        return this.i18n("apps.compare.results.by.time.spent");
                    }
                    return this.i18n("apps.compare.results.by.avg.session.duration");
                },
                set: function(selectedItem) {
                    var self = this;
                    var selectedApps = this.$store.getters["countlyCompareApps/selectedApps"];
                    if (selectedItem === this.i18n("apps.compare.results.by.total.sessions")) {
                        self.selectedMetric = "totalSessions";
                        this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "total-sessions");
                        this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                    }
                    else if (selectedItem === this.i18n("apps.compare.results.by.total.visitors")) {
                        self.selectedMetric = "totalVisitors";
                        this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "total-users");
                        this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                    }
                    else if (selectedItem === this.i18n("apps.compare.results.by.new.visitors")) {
                        self.selectedMetric = "newVisitors";
                        this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "new-users");
                        this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                    }
                    else if (selectedItem === this.i18n("apps.compare.results.by.time.spent")) {
                        self.selectedMetric = "timeSpent";
                        this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "total-time-spent");
                        this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                    }
                    else {
                        self.selectedMetric = "avgSessionDuration";
                        this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "time-spent");
                        this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                    }
                }
            },
        },
        data: function() {
            return {
                value: "",
                maxLimit: 20,
                placeholder: this.i18n("compare.apps.maximum.placeholder"),
                availableMetrics: [
                    this.i18n("apps.compare.results.by.total.sessions"),
                    this.i18n("apps.compare.results.by.total.visitors"),
                    this.i18n("apps.compare.results.by.new.visitors"),
                    this.i18n("apps.compare.results.by.time.spent"),
                    this.i18n("apps.compare.results.by.avg.session.duration")
                ],
                selectedMetric: "totalSessions"
            };
        },
        beforeCreate: function() {
            this.$store.dispatch('countlyCompareApps/initializeTableStateMap');
        }

    });
    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: CompareApps,
            vuex: [{
                clyModel: countlyCompareApps
            }]
        });
    };
    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route("/compare", "compare-apps", function() {
            var view = getMainView();
            view.params = {app_id: countlyCommon.ACTIVE_APP_ID};
            this.renderWhenReady(view);
        });
    }
})();