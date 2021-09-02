/* global countlyVue, countlyCompareEvents, countlyCommon, countlyAuth CV*/
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
            }
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
                this.$store.dispatch('countlyCompareEvents/fetchSelectedEvents', this.value);
                this.$store.dispatch('countlyCompareEvents/fetchCompareEventsData');
            },
            refresh: function() {
                var selectedEvents = this.$store.getters["countlyCompareEvents/selectedEvents"];
                if (selectedEvents.length > 0) {
                    this.$store.dispatch('countlyCompareEvents/fetchRefreshCompareEventsData');
                }
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
            selectedDatePeriod: {
                get: function() {
                    return this.$store.getters["countlyCompareEvents/selectedDatePeriod"];
                },
                set: function(period) {
                    this.$store.dispatch('countlyCompareEvents/fetchSelectedDatePeriod', period);
                    countlyCommon.setPeriod(period);
                    this.$store.dispatch('countlyCompareEvents/fetchCompareEventsData', this.value);
                }
            },
            selectedGraph: {
                get: function() {
                    var self = this;
                    if (self.selectedMetric === "Sum") {
                        return this.i18n("events.compare.results.by.sum");
                    }
                    else if (self.selectedMetric === "Duration") {
                        return this.i18n("events.compare.results.by.duration");
                    }
                    return this.i18n("events.compare.results.by.count");
                },
                set: function(selectedItem) {
                    var self = this;
                    var selectedEvents = this.$store.getters["countlyCompareEvents/selectedEvents"];
                    if (selectedItem === this.i18n("events.compare.results.by.sum")) {
                        self.selectedMetric = "Sum";
                        this.$store.dispatch('countlyCompareEvents/fetchSelectedGraphMetric', "s");
                        this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
                    }
                    else if (selectedItem === this.i18n("events.compare.results.by.duration")) {
                        self.selectedMetric = "Duration";
                        this.$store.dispatch('countlyCompareEvents/fetchSelectedGraphMetric', "dur");
                        this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
                    }
                    else {
                        self.selectedMetric = "Count";
                        this.$store.dispatch('countlyCompareEvents/fetchSelectedGraphMetric', "c");
                        this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
                    }
                }
            },
        },
        data: function() {
            return {
                value: "",
                maxLimit: 20,
                availableMetrics: [
                    this.i18n("events.compare.results.by.count"),
                    this.i18n("events.compare.results.by.sum"),
                    this.i18n("events.compare.results.by.duration")
                ],
                selectedMetric: "Count"
            };
        },
        beforeCreate: function() {
            countlyCommon.setPeriod("30days");
            this.$store.dispatch('countlyCompareEvents/fetchAllEventsData');
        }

    });

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        countlyVue.container.registerTab("/analytics/events", {
            priority: 2,
            name: "compareEvents",
            title: "Compare Events",
            component: CompareEvents,
            vuex: [{
                clyModel: countlyCompareEvents
            }]
        });
    }
})();