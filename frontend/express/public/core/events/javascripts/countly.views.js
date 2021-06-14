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
    template: '#overview-tables-events'
});

var EventsBreakdownHorizontalTile = countlyVue.views.BaseView.extend({
    props: {
        trend: {
            type: String
        },
        change: {
            type: String
        }
    },
    template: '<div class="cly-events-breakdown-horizontal-tile bu-column bu-is-4">\
    <div class="cly-events-breakdown-horizontal-tile__wrapper">\
    <slot name="title"></slot>\
        <div class="cly-events-breakdown-horizontal-tile__values-list bu-columns bu-is-gapless bu-is-multiline bu-is-mobile">\
            <div class="bu-column bu-is-12">\
                <div class="cly-events-breakdown-horizontal-tile__item">\
                    <div class="bu-level bu-is-mobile cly-events-breakdown-horizontal-tile__item-title">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item">\
                            <slot name="countValue"></slot>\
                            <span v-if="trend === \'u\'" class="cly-events-breakdown-horizontal-tile--green"><i class="fas fa-arrow-up"></i>{{change}}</span>\
                            <span v-else class="cly-events-breakdown-horizontal-tile--red"><i class="fas fa-arrow-down"></i>{{change}}</span>\
                            </div>\
                        </div>\
                        <slot name="totalPercentage">\
                        </slot>\
                    </div>\
                    <slot name="progressBar"></slot>\
                </div>\
            </div>\
        </div>\
    </div>\
</div>'
});

var EventsOverviewView = countlyVue.views.BaseView.extend({
    template: "#events-overview",
    components: {
        "detail-tables": EventsTable,
        "events-breakdown-horizontal-tile": EventsBreakdownHorizontalTile

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
    beforeCreate: function() {
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