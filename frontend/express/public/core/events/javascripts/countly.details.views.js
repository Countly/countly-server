/* global countlyVue, countlyAllEvents, countlyCompareEvents, countlyCommon, countlyAuth CV,app*/
(function() {
    var FEATURE_NAME = "compare";
    var EventsTable = countlyVue.views.BaseView.extend({
        mixins: [countlyVue.mixins.i18n],
        data: function() {
            return {
                scoreTableExportSettings: {
                    title: "AllEvents",
                    timeDependent: true
                }
            };
        },
        computed: {
            eventsTableRows: function() {
                return this.$store.getters["countlyAllEvents/tableRows"];
            },
            selectedSegment: function() {
                return this.$store.getters["countlyAllEvents/currentActiveSegmentation"];
            },
            labels: function() {
                return this.$store.getters["countlyAllEvents/labels"];
            }
        },
        methods: {
            isColumnAllowed: function(column) {
                var events = this.$store.getters["countlyAllEvents/allEventsProcessed"];
                if (column === 'count') {
                    if (events && events.tableColumns && events.tableColumns.indexOf(this.labels.count) !== -1) {
                        return true;
                    }
                    return false;
                }
                else if (column === 'sum') {
                    if (events && events.tableColumns && events.tableColumns.indexOf(this.labels.sum) !== -1) {
                        return true;
                    }
                    return false;
                }
                else if (column === 'dur') {
                    if (events && events.tableColumns && events.tableColumns.indexOf(this.labels.dur) !== -1) {
                        return true;
                    }
                    return false;
                }
                if (events && events.tableColumns && events.tableColumns.indexOf(column) !== -1) {
                    return true;
                }
                return false;
            }
        },
        template: '#tables-events'
    });

    var CompareEventsTable = countlyVue.views.BaseView.extend({
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
                    if (item.id.startsWith("[CLY]_group")) {
                        selectedEvents.push(item.id);
                    }
                    else {
                        selectedEvents.push(item.name);
                    }
                });
                this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
                this.$store.dispatch('countlyCompareEvents/fetchLegendData', selectedEvents);
            },
            handleAllChange: function(selection) {
                var selectedEvents = [];
                selection.forEach(function(item) {
                    if (item.id.startsWith("[CLY]_group")) {
                        selectedEvents.push(item.id);
                    }
                    else {
                        selectedEvents.push(item.name);
                    }
                });
                this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
                this.$store.dispatch('countlyCompareEvents/fetchLegendData', selectedEvents);
            }
        },
        template: '#compare-events-table'
    });

    var EventsPages = countlyVue.views.BaseView.extend({
        template: "#events-pages",
        data: function() {
            return {
                dynamicTab: (this.$route.params && this.$route.params.tab) || "allEvents",
                tabs: [
                    {
                        title: "Event Stats",
                        name: "allEvents",
                        component: AllEventsView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/events/key/" + localStorage.getItem("eventKey")
                    },
                    {
                        title: "Compare Events",
                        name: "compareEvents",
                        component: CompareEvents,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/events/compare"
                    }
                ],
            };
        }
    });

    var CompareEvents = countlyVue.views.BaseView.extend({
        template: "#compare-events",
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

    var EventsWrapper = countlyVue.views.BaseView.extend({
        template: "#events-wrapper",
        components: {
            "events-pages": EventsPages,
        }
    });

    var AllEventsView = countlyVue.views.BaseView.extend({
        template: "#all-events",
        components: {
            "detail-tables": EventsTable,
        },
        computed: {
            selectedDatePeriod: {
                get: function() {
                    return this.$store.getters["countlyAllEvents/selectedDatePeriod"];
                },
                set: function(value) {
                    this.$store.dispatch('countlyAllEvents/fetchSelectedDatePeriod', value);
                    countlyCommon.setPeriod(value);
                    this.$store.dispatch('countlyAllEvents/fetchAllEventsData');
                }
            },
            selectedEventFromSearchBar: {
                get: function() {
                    return this.$store.getters["countlyAllEvents/selectedEventName"];
                },
                set: function(value) {
                    this.$store.dispatch('countlyAllEvents/fetchSelectedEventName', value);
                    this.$store.dispatch("countlyAllEvents/fetchCurrentActiveSegmentation", "segment");
                    this.$store.dispatch('countlyAllEvents/fetchAllEventsData');
                }
            },
            selectedSegment: {
                get: function() {
                    return this.$store.getters["countlyAllEvents/currentActiveSegmentation"];
                },
                set: function(selectedItem) {
                    if (selectedItem === "segment") {
                        this.$store.dispatch("countlyAllEvents/fetchCurrentActiveSegmentation", "segment");
                    }
                    else {
                        this.$store.dispatch("countlyAllEvents/fetchCurrentActiveSegmentation", selectedItem);
                    }
                    this.$store.dispatch("countlyAllEvents/fetchSelectedEventsData");
                }
            },
            hasSegments: function() {
                return this.$store.getters["countlyAllEvents/hasSegments"];
            },
            availableSegments: function() {
                return this.$store.getters["countlyAllEvents/availableSegments"];
            },
            selectedEventName: function() {
                return this.$store.getters["countlyAllEvents/allEventsProcessed"].eventName;
            },
            groupData: function() {
                return this.$store.getters["countlyAllEvents/groupData"];
            },
            selectedEventDescription: function() {
                return this.$store.getters["countlyAllEvents/description"];
            },
            currentActiveSegmentation: function() {
                return this.$store.getters["countlyAllEvents/currentActiveSegmentation"];
            },
            chartData: function() {
                return this.$store.getters["countlyAllEvents/lineChartData"];
            },
            barData: function() {
                return this.$store.getters["countlyAllEvents/barData"];
            },
            selectedEventsOverview: function() {
                return this.$store.getters["countlyAllEvents/selectedEventsOverview"];
            },
            lineLegend: function() {
                return this.$store.getters["countlyAllEvents/legendData"];
            },
            searchPlaceholder: function() {
                var list = this.$store.getters["countlyAllEvents/allEventsList"];
                if (list) {
                    return this.i18n("events.all.search.placeholder", list.length);
                }
                return this.i18n("events.all.search.placeholder");
            },
            allEvents: function() {
                return this.$store.getters["countlyAllEvents/allEventsList"];
            },
            eventDescription: function() {
                return this.$store.getters["countlyAllEvents/allEventsProcessed"].eventDescription;
            },
            labels: function() {
                return this.$store.getters["countlyAllEvents/allEventsProcessed"].chartDP;
            },
            limitAlerts: function() {
                return this.$store.getters["countlyAllEvents/limitAlerts"];
            }

        },
        data: function() {
            return {description: CV.i18n('events.all.title.new') };
        },
        beforeCreate: function() {
            countlyCommon.setPeriod("30days");
            if (this.$route.params) {
                this.$store.dispatch('countlyAllEvents/fetchSelectedEventName', this.$route.params.eventKey);
            }
            this.$store.dispatch('countlyAllEvents/fetchAllEventsData');
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyAllEvents/fetchRefreshAllEventsData");
            }
        }
    });


    var getCompareEventsView = function() {
        var compareEventsVuex = [{
            clyModel: countlyCompareEvents
        }];

        return new countlyVue.views.BackboneWrapper({
            component: EventsWrapper,
            vuex: compareEventsVuex,
            templates: [
                "/core/events/templates/allEvents.html",
                "/core/events/templates/compareEvents.html"
            ]
        });
    };

    var getAllEventsView = function() {
        var allEventsVuex = [{
            clyModel: countlyAllEvents
        }];

        return new countlyVue.views.BackboneWrapper({
            component: EventsWrapper,
            vuex: allEventsVuex,
            templates: [
                "/core/events/templates/allEvents.html",
                "/core/events/templates/compareEvents.html"
            ]
        });
    };

    app.route("/analytics/events/key/:eventKey", "all-events", function(eventKey) {
        var params = {
            eventKey: eventKey && eventKey !== "undefined" ? eventKey : undefined
        };
        var EventAllView = getAllEventsView();
        EventAllView.params = params;
        this.renderWhenReady(EventAllView);
    });

    app.route("/analytics/events", "all-events", function() {
        var params = {
            eventKey: localStorage.getItem("eventKey") || undefined
        };
        var EventsAllView = getAllEventsView();
        EventsAllView.params = params;
        this.renderWhenReady(EventsAllView);
    });

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route("/analytics/events/compare", "compare-events", function() {
            var params = {
                tab: "compareEvents"
            };
            var compareEventsView = getCompareEventsView();
            compareEventsView.params = params;
            this.renderWhenReady(compareEventsView);
        });
    }
})();