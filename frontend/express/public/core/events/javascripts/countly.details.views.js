/* global countlyVue, countlyGlobal, countlyAllEvents, countlyCommon, CV,app*/
(function() {
    var EventsTable = countlyVue.views.create({
        template: CV.T("/core/events/templates/eventsTable.html"),
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
            },
            isTableLoading: function() {
                return this.$store.getters["countlyAllEvents/isTableLoading"];
            },
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
            },
            formatNumber: function(val) {
                return countlyCommon.formatNumber(val);
            }
        },
    });

    var EventsView = countlyVue.views.create({
        template: CV.T("/core/events/templates/eventTabs.html"),
        mixins: [
            countlyVue.container.tabsMixin({
                "eventsTabs": "/analytics/events"
            })
        ],
        data: function() {
            return {
                selectedTab: (this.$route.params && this.$route.params.tab) || "detail"
            };
        },
        computed: {
            tabs: function() {
                return this.eventsTabs;
            }
        }
    });

    var AllEventsView = countlyVue.views.create({
        template: CV.T("/core/events/templates/allEvents.html"),
        components: {
            "detail-tables": EventsTable,
        },
        methods: {
            dateChanged: function() {
                this.$store.dispatch('countlyAllEvents/setTableLoading', true);
                this.$store.dispatch('countlyAllEvents/setChartLoading', true);
                this.$store.dispatch('countlyAllEvents/fetchAllEventsData');
            }
        },
        computed: {
            selectedEventFromSearchBar: {
                get: function() {
                    return this.$store.getters["countlyAllEvents/selectedEventName"];
                },
                set: function(value) {
                    this.$store.dispatch('countlyAllEvents/setTableLoading', true);
                    this.$store.dispatch('countlyAllEvents/setChartLoading', true);

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
                    this.$store.dispatch('countlyAllEvents/setChartLoading', true);

                    this.$store.dispatch('countlyAllEvents/setTableLoading', true);

                    if (selectedItem === "segment") {
                        this.$store.dispatch("countlyAllEvents/fetchCurrentActiveSegmentation", "segment");
                    }
                    else {
                        this.$store.dispatch("countlyAllEvents/fetchCurrentActiveSegmentation", selectedItem);
                    }
                    this.$store.dispatch("countlyAllEvents/fetchSelectedEventsData");
                    this.$store.dispatch("countlyAllEvents/setSegmentDescription");
                }
            },
            hasSegments: function() {
                return this.$store.getters["countlyAllEvents/hasSegments"];
            },
            category: function() {
                return this.$store.getters["countlyAllEvents/currentCategory"];
            },
            segmentDescription: function() {
                return this.$store.getters["countlyAllEvents/segmentDescription"];
            },
            availableSegments: function() {
                var availableSegments = this.$store.getters["countlyAllEvents/availableSegments"];
                if (availableSegments) {
                    return availableSegments.map(function(item) {
                        if (item === "segment") {
                            return {
                                "label": CV.i18n("events.all.any.segmentation"),
                                "value": item
                            };
                        }
                        else {
                            return {
                                "label": item,
                                "value": item
                            };
                        }
                    });
                }
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
            },
            isChartLoading: function() {
                return this.$store.getters["countlyAllEvents/isChartLoading"];
            }

        },
        data: function() {
            return {description: CV.i18n('events.all.title.new') };
        },
        beforeCreate: function() {
            var self = this;
            this.$store.dispatch('countlyAllEvents/setTableLoading', true);
            this.$store.dispatch('countlyAllEvents/setChartLoading', true);
            var appId = countlyCommon.ACTIVE_APP_ID;
            var currEvent = this.$route.params && this.$route.params.eventKey;
            if (!currEvent) {
                var eventKey = localStorage.getItem("eventKey");
                try {
                    if (eventKey) {
                        eventKey = JSON.parse(eventKey);
                        currEvent = eventKey[appId];
                    }
                }
                catch (err) {
                    currEvent = undefined;
                }
            }
            if (currEvent) {
                this.$store.dispatch('countlyAllEvents/fetchSelectedEventName', currEvent);
            }
            if (countlyGlobal.plugins.indexOf("drill") > -1 && countlyGlobal.plugins.indexOf("data-manager") > -1) {
                this.$store.dispatch('countlyAllEvents/fetchSegments');
                this.$store.dispatch('countlyAllEvents/fetchCategories').then(function() {
                    self.$store.dispatch('countlyAllEvents/fetchAllEventsData');
                });
            }
            else {
                this.$store.dispatch('countlyAllEvents/fetchAllEventsData');
            }

        }
    });
    var getAllEventsView = function() {
        var tabsVuex = countlyVue.container.tabsVuex(["/analytics/events"]);
        return new countlyVue.views.BackboneWrapper({
            component: EventsView,
            vuex: tabsVuex
        });
    };
    app.route("/analytics/events", "events", function() {
        var eventsViewWrapper = getAllEventsView();
        this.renderWhenReady(eventsViewWrapper);
    });

    app.route("/analytics/events/*tab", "events-tab", function(tab) {
        var eventsViewWrapper = getAllEventsView();

        var params = {
            tab: tab,
        };
        eventsViewWrapper.params = params;
        this.renderWhenReady(eventsViewWrapper);
    });

    countlyVue.container.registerTab("/analytics/events", {
        priority: 1,
        name: "detail",
        permission: "events",
        title: "Event Stats",
        route: "#/analytics/events",
        component: AllEventsView,
        vuex: [{
            clyModel: countlyAllEvents
        }],
    });
    app.route("/analytics/events/key/:eventKey", "events", function(eventKey) {
        var params = {
            eventKey: eventKey
        };
        var eventsViewWrapper = getAllEventsView();
        eventsViewWrapper.params = params;
        this.renderWhenReady(eventsViewWrapper);
    });
})();