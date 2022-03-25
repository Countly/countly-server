/* global countlyVue, countlyCompareApps, countlyCommon, CV, countlyCommon, app*/
(function() {
    var CompareAppsTable = countlyVue.views.create({
        template: CV.T("/compare/templates/compareAppsTable.html"),
        mixins: [countlyVue.mixins.i18n],
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
            },
            isTableLoading: function() {
                return this.$store.getters["countlyCompareApps/isTableLoading"];
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
                this.$store.dispatch('countlyCompareApps/setTableLoading', true);
                this.$store.dispatch('countlyCompareApps/setChartLoading', true);
                this.$store.dispatch('countlyCompareApps/setSelectedApps', this.value);
                this.$store.dispatch('countlyCompareApps/fetchCompareAppsData');
            },
            dateChanged: function() {
                this.$store.dispatch('countlyCompareApps/setTableLoading', true);
                this.$store.dispatch('countlyCompareApps/setChartLoading', true);
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
            selectedGraph: {
                get: function() {
                    var self = this;
                    if (self.selectedMetric === "totalSessions") {
                        return this.i18n("compare.apps.results.by.total.sessions");
                    }
                    else if (self.selectedMetric === "totalVisitors") {
                        return this.i18n("compare.apps.results.by.total.visitors");
                    }
                    else if (self.selectedMetric === "newVisitors") {
                        return this.i18n("compare.apps.results.by.new.visitors");
                    }
                    else if (self.selectedMetric === "timeSpent") {
                        return this.i18n("compare.apps.results.by.time.spent");
                    }
                    return this.i18n("compare.apps.results.by.avg.session.duration");
                },
                set: function(selectedItem) {
                    var self = this;
                    this.$store.dispatch('countlyCompareApps/setTableLoading', true);
                    this.$store.dispatch('countlyCompareApps/setChartLoading', true);
                    var selectedApps = this.$store.getters["countlyCompareApps/selectedApps"];
                    if (selectedItem === "totalSessions") {
                        self.selectedMetric = "totalSessions";
                        this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "total-sessions");
                        this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                    }
                    else if (selectedItem === "totalVisitors") {
                        self.selectedMetric = "totalVisitors";
                        this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "total-users");
                        this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                    }
                    else if (selectedItem === "newVisitors") {
                        self.selectedMetric = "newVisitors";
                        this.$store.dispatch('countlyCompareApps/setSelectedGraphMetric', "new-users");
                        this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
                    }
                    else if (selectedItem === "timeSpent") {
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
            isChartLoading: function() {
                return this.$store.getters["countlyCompareApps/isChartLoading"];
            }
        },
        data: function() {
            return {
                value: "",
                maxLimit: 20,
                placeholder: this.i18n("compare.apps.maximum.placeholder"),
                availableMetrics: [
                    { key: "totalSessions", label: this.i18n("compare.apps.results.by.total.sessions")},
                    { key: "totalVisitors", label: this.i18n("compare.apps.results.by.total.visitors")},
                    { key: "newVisitors", label: this.i18n("compare.apps.results.by.new.visitors")},
                    { key: "timeSpent", label: this.i18n("compare.apps.results.by.time.spent")},
                    { key: "avgSessionDuration", label: this.i18n("compare.apps.results.by.avg.session.duration")}
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
    app.route("/compare", "compare-apps", function() {
        var view = getMainView();
        view.params = {app_id: countlyCommon.ACTIVE_APP_ID};
        this.renderWhenReady(view);
    });

    countlyVue.container.registerData("/apps/compare", {
        enabled: {"default": true}
    });
})();