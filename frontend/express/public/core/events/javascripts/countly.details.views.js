/* global countlyVue, countlyAllEvents, countlyCommon, CV,app*/
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
    },
    methods: {
        isColumnAllowed: function(column) {
            var events = this.$store.getters["countlyAllEvents/allEventsProcessed"];
            if (events && events.tableColumns && events.tableColumns.indexOf(column) !== -1) {
                return true;
            }
            return false;
        }
    },
    template: '#tables-events'
});

var AllEventsView = countlyVue.views.BaseView.extend({
    template: "#all-events",
    components: {
        "detail-tables": EventsTable
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
            return this.$store.getters["countlyAllEvents/selectedEventName"];
        },
        isGroup: function() {
            return this.$store.getters["countlyAllEvents/isGroup"];
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
        }
    },
    data: function() {
        return {
            description: CV.i18n('events.all.title.new')
        };
    },
    beforeCreate: function() {
        countlyCommon.setPeriod("30days");
        if (this.$route.params) {
            this.$store.dispatch('countlyAllEvents/fetchSelectedEventName', this.$route.params.eventKey);
        }
        this.$store.dispatch('countlyAllEvents/fetchAllEventsData');
        this.$store.dispatch('countlyAllEvents/fetchAllEventsGroupData');
    }
});

var allEventsVuex = [{
    clyModel: countlyAllEvents
}];

var AllEventsViewWrapper = new countlyVue.views.BackboneWrapper({
    component: AllEventsView,
    vuex: allEventsVuex,
    templates: [
        "/core/events/templates/allEvents.html"
    ]
});

app.route("/analytics/events/key/:eventKey", "all-events", function(eventKey) {
    var params = {
        eventKey: eventKey
    };

    AllEventsViewWrapper.params = params;
    this.renderWhenReady(AllEventsViewWrapper);
});