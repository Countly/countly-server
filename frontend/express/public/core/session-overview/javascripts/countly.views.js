/* global countlyVue,CV,countlySessionOverview,app*/
var SessionOverviewDatePicker = countlyVue.views.BaseView.extend({
    template: "#session-overview-date-picker",
    computed: {
        selectedDatePeriod: {
            get: function() {
                return this.$store.state.countlySessionOverview.selectedDatePeriod;
            },
            set: function(value) {
                this.$store.dispatch('countlySessionOverview/onSetSelectedDatePeriod', value);
                this.$store.dispatch('countlySessionOverview/fetchAll');
            }
        }
    }
});

var SessionOverviewLineChart = countlyVue.views.BaseView.extend({
    template: "#session-overview-line-chart",
    data: function() {
        return {
        };
    },
    computed: {
        sessionOverview: function() {
            return this.$store.state.countlySessionOverview.sessionOverview;
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
        },
        isLoading: function() {
            return this.$store.state.countlySessionOverview.isLoading;
        }
    }
});

var SessionOverviewTable = countlyVue.views.BaseView.extend({
    template: "#session-overview-table",
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
        sessionOverviewRows: function() {
            return this.$store.state.countlySessionOverview.sessionOverview.rows;
        }
    }
});

var SessionOverviewView = countlyVue.views.BaseView.extend({
    template: "#session-overview",
    components: {
        "session-overview-date-picker": SessionOverviewDatePicker,
        "session-overview-line-chart": SessionOverviewLineChart,
        "session-overview-table": SessionOverviewTable
    },
    data: function() {
        return {
            description: CV.i18n('session-overview.description')
        };
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

var sessionOverviewVuex = [{
    clyModel: countlySessionOverview
}];

app.route("/analytics/sessions", "sessions", function() {
    var sessionOverviewViewWrapper = new countlyVue.views.BackboneWrapper({
        component: SessionOverviewView,
        vuex: sessionOverviewVuex,
        templates: [ "/core/session-overview/templates/session-overview.html"]
    });
    this.renderWhenReady(sessionOverviewViewWrapper);
});