/* global countlyVue, countlyCompareEvents, CV, countlyCommon*/
(function() {
    var FEATURE_NAME = "compare";
    var CompareEventsTable = countlyVue.views.create({
        template: CV.T("/compare/templates/compareEventsTable.html"),
        mixins: [countlyVue.mixins.i18n],
        data: function() {
            return {
                scoreTableExportSettings: {
                    title: "CompareEvents",
                    timeDependent: true,
                }
            };
        },
        updated: function() {
            this.$refs.compareEvents.$refs.elTable.clearSelection();
            var self = this;
            this.$store.getters["countlyCompareEvents/tableRows"]
                .map(function(row) {
                    if (row.checked) {
                        self.$refs.compareEvents.$refs.elTable.toggleRowSelection(row, true);
                    }
                    else {
                        self.$refs.compareEvents.$refs.elTable.toggleRowSelection(row, false);
                    }
                });
        },
        computed: {
            eventsTableRows: function() {
                return this.$store.getters["countlyCompareEvents/tableRows"];
            },
            groupData: function() {
                return this.$store.getters["countlyCompareEvents/groupData"];
            },
            isTableLoading: function() {
                return this.$store.getters["countlyCompareEvents/isTableLoading"];
            },
        },
        methods: {
            handleCurrentChange: function(selection) {
                var selectedEvents = [];
                selection.forEach(function(item) {
                    selectedEvents.push(item.id);
                });
                this.$store.dispatch('countlyCompareEvents/updateTableStateMap', selection);
                this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
                this.$store.dispatch('countlyCompareEvents/fetchLegendData', selectedEvents);
            },
            handleAllChange: function(selection) {
                var selectedEvents = [];
                selection.forEach(function(item) {
                    selectedEvents.push(item.id);
                });
                this.$store.dispatch('countlyCompareEvents/updateTableStateMap', selection);
                this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
                this.$store.dispatch('countlyCompareEvents/fetchLegendData', selectedEvents);
            },
            formatDuration: function(value) {
                return countlyCommon.formatSecond(value);
            }
        },
    });

    var CompareEvents = countlyVue.views.create({
        template: CV.T("/compare/templates/compare.html"),
        components: {
            "detail-tables": CompareEventsTable,
        },
        methods: {
            compareEvents: function() {
                this.$store.dispatch('countlyCompareEvents/setTableLoading', true);
                this.$store.dispatch('countlyCompareEvents/setChartLoading', true);
                this.$store.dispatch('countlyCompareEvents/fetchSelectedEvents', this.value);
                this.$store.dispatch('countlyCompareEvents/fetchCompareEventsData');
            },
            refresh: function() {
                var selectedEvents = this.$store.getters["countlyCompareEvents/selectedEvents"];
                if (selectedEvents.length > 0) {
                    this.$store.dispatch('countlyCompareEvents/fetchRefreshCompareEventsData');
                }
            },
            dateChanged: function() {
                this.$store.dispatch('countlyCompareEvents/setTableLoading', true);
                this.$store.dispatch('countlyCompareEvents/setChartLoading', true);
                this.$store.dispatch('countlyCompareEvents/fetchCompareEventsData', this.value);
            },
            formatChartValue: function(value) {
                if (["Duration", "AvgDuration"].includes(this.selectedMetric)) {
                    return countlyCommon.formatSecond(value);
                }
                return countlyCommon.getShortNumber(value);
            }
        },
        computed: {
            allEventsList: function() {
                return this.$store.getters["countlyCompareEvents/allEventsList"];
            },
            lineChartData: function() {
                return this.$store.getters["countlyCompareEvents/lineChartData"];
            },
            lineLegend: function() {
                return this.$store.getters["countlyCompareEvents/lineLegend"];
            },
            selectedGraph: {
                get: function() {
                    var self = this;
                    let metric = this.availableMetrics.find(function(item) {
                        return item.key === self.selectedMetric;
                    });
                    return metric.label || this.i18n("compare.events.results.by.count");
                },
                set: function(selectedItem) {
                    this.$store.dispatch('countlyCompareEvents/setTableLoading', true);
                    this.$store.dispatch('countlyCompareEvents/setChartLoading', true);
                    var selectedEvents = this.$store.getters["countlyCompareEvents/selectedEvents"];
                    let metric = this.availableMetrics.find(function(item) {
                        return item.key === selectedItem;
                    });
                    metric = metric || this.availableMetrics[0];

                    this.selectedMetric = metric.key;
                    this.$store.dispatch('countlyCompareEvents/fetchSelectedGraphMetric', metric.graphMetric);
                    this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
                }
            },
            isChartLoading: function() {
                return this.$store.getters["countlyCompareEvents/isChartLoading"];
            }
        },
        data: function() {
            return {
                value: "",
                maxLimit: 20,
                availableMetrics: [
                    { key: "Count", label: this.i18n("compare.events.results.by.count"), graphMetric: "c"},
                    { key: "Sum", label: this.i18n("compare.events.results.by.sum"), graphMetric: "s"},
                    { key: "Duration", label: this.i18n("compare.events.results.by.duration"), graphMetric: "dur"},
                    { key: "AvgDuration", label: this.i18n("compare.events.results.by.avg.duration"), graphMetric: "avgDur"}
                ],
                selectedMetric: "Count"
            };
        },
        beforeCreate: function() {
            this.$store.dispatch('countlyCompareEvents/fetchAllEventsData');
        }

    });

    countlyVue.container.registerTab("/analytics/events", {
        priority: 2,
        name: "compare",
        permission: FEATURE_NAME,
        title: "Compare Events",
        component: CompareEvents,
        vuex: [{
            clyModel: countlyCompareEvents
        }]
    });
})();