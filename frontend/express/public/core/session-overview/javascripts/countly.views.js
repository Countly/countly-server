/* global countlyVue,CV,countlySessionOverview,app,countlyCommon*/
var SessionOverviewView = countlyVue.views.create({
    template: CV.T("/core/session-overview/templates/session-overview.html"),
    data: function() {
        return {};
    },
    computed: {
        sessionOverview: function() {
            return this.$store.state.countlySessionOverview.sessionOverview;
        },
        isLoading: function() {
            return this.$store.state.countlySessionOverview.isLoading;
        },
        selectedDatePeriod: {
            get: function() {
                return this.$store.state.countlySessionOverview.selectedDatePeriod;
            },
            set: function(value) {
                this.$store.dispatch('countlySessionOverview/onSetSelectedDatePeriod', value);
                this.$store.dispatch('countlySessionOverview/fetchAll');
            }
        },
        sessionOverviewRows: function() {
            return this.$store.state.countlySessionOverview.sessionOverview.rows;
        },
        sessionOverviewOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionOverviewDatePeriods
                },
                series: this.yAxisSessionOverviewCountSeries
            };
        },
        xAxisSessionOverviewDatePeriods: function() {
            return this.$store.state.countlySessionOverview.sessionOverview.rows.map(function(tableRow) {
                return tableRow.date;
            });
        },
        yAxisSessionOverviewCountSeries: function() {
            return this.sessionOverview.series.map(function(sessionOverviewSerie) {
                return {
                    data: sessionOverviewSerie.data,
                    name: sessionOverviewSerie.label,
                };
            });
        }
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySessionOverview/fetchAll');
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionOverview/fetchAll');
    },
});

//Note: the parent component that renders all session analytics tabs.
var SessionAnalyticsView = countlyVue.views.create({
    template: CV.T("/core/session-overview/templates/session-analytics.html"),
    mixins: [
        countlyVue.container.tabsMixin({
            "sessionAnalyticsTabs": "/analytics/sessions"
        })
    ],
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "overview"
        };
    },
    computed: {
        tabs: function() {
            return this.sessionAnalyticsTabs;
        }
    }
});

var getSessionAnalyticsView = function() {
    var tabsVuex = countlyVue.container.tabsVuex(["/analytics/sessions"]);
    return new countlyVue.views.BackboneWrapper({
        component: SessionAnalyticsView,
        vuex: tabsVuex,
        templates: []
    });
};

app.route("/analytics/sessions", "sessions", function() {
    var sessionAnalyticsViewWrapper = getSessionAnalyticsView();
    this.renderWhenReady(sessionAnalyticsViewWrapper);
});

app.route("/analytics/sessions/*tab", "sessions-tab", function(tab) {
    var sessionAnalyticsViewWrapper = getSessionAnalyticsView();
    var params = {
        tab: tab
    };
    sessionAnalyticsViewWrapper.params = params;
    this.renderWhenReady(sessionAnalyticsViewWrapper);
});

countlyVue.container.registerTab("/analytics/sessions", {
    priority: 1,
    name: "overview",
    title: "Session Overview",
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/sessions/overview",
    component: SessionOverviewView,
    vuex: [{
        clyModel: countlySessionOverview
    }]
});