/* global countlyVue, countlyEventsOverview,CV,app*/
var EventsTable = countlyVue.views.BaseView.extend({
    mixins: [countlyVue.mixins.i18n],
    data: function() {
        return {
            scoreTableExportSettings: {
                title: "Events",
                timeDependent: true
            }
        };
    },
    computed: {
        eventsTableRows: function() {
            return this.$store.getters["countlyEventsOverview/detailEvents"];
        },
    },
    template: '#overview-tables-events',
    components: {
    }
});

var EventsOverviewView = countlyVue.views.BaseView.extend({
    template: "#events-overview",
    components: {
        "detail-tables": EventsTable
    },
    computed: {
        topEvents: function() {
            return this.$store.getters["countlyEventsOverview/topEvents"];
        },
        eventsOverview: function() {
            return this.$store.getters["countlyEventsOverview/eventsOverview"];
        }
    },
    data: function() {
        return {
            description: CV.i18n('events.overview.title.new')
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyEventsOverview/fetchDetailEvents');
        this.$store.dispatch('countlyEventsOverview/fetchTopEvents');
    }
});

var eventsOverviewVuex = [{
    clyModel: countlyEventsOverview
}];

var EventsOverviewViewWrapper = new countlyVue.views.BackboneWrapper({
    component: EventsOverviewView,
    vuex: eventsOverviewVuex,
    templates: [
        "/core/events/templates/overview.html"
    ]
});

app.route("/analytics/events/overview", "overview", function() {
    this.renderWhenReady(EventsOverviewViewWrapper);
});