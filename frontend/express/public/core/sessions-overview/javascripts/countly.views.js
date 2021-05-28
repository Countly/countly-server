/* global countlyVue,CV,countlySessionsOverview,app*/
var SessionsOverviewDatePicker = countlyVue.views.BaseView.extend({
    template: "#sessions-overview-date-picker",
    computed: {
        selectedDatePeriod: {
            get: function() {
                return this.$store.state.countlySessionsOverview.selectedDatePeriod;
            },
            set: function(value) {
                this.$store.dispatch('countlySessionsOverview/onSetSelectedDatePeriod', value);
                this.$store.dispatch('countlySessionsOverview/fetchAll');
            }
        }
    }
});

var SessionsOverviewLineChart = countlyVue.views.BaseView.extend({
    template: "#sessions-overview-line-chart",
    data: function() {
        return {
            lineChartItemsLegends: {
                newSessions: CV.i18n('common.new-sessions'),
                totalSessions: CV.i18n('common.total-sessions'),
                uniqueSessions: CV.i18n('common.unique-sessions')
            },
        };
    },
    computed: {
        sessionsOverview: function() {
            return this.$store.state.countlySessionsOverview.sessionsOverview;
        },
        sessionsOverviewOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionsOverviewDatePeriods
                },
                series: this.yAxisSessionsOverviewCountSeries
            };
        },
        xAxisSessionsOverviewDatePeriods: function() {
            return this.$store.state.countlySessionsOverview.sessionsOverview.rows.map(function(tableRow) {
                return tableRow.date;
            });
        },
        yAxisSessionsOverviewCountSeries: function() {
            var self = this;
            return Object.keys(this.sessionsOverview.series).map(function(sessionsOverviewKey) {
                return {
                    data: self.sessionsOverview.series[sessionsOverviewKey],
                    name: self.lineChartItemsLegends[sessionsOverviewKey],
                };
            });
        },
        isLoading: function() {
            return this.$store.state.countlySessionsOverview.isLoading;
        }
    }
});

var SessionsOverviewTable = countlyVue.views.BaseView.extend({
    template: "#sessions-overview-table",
    data: function() {
        return {};
    },
    computed: {
        sessionsOverview: function() {
            return this.$store.state.countlySessionsOverview.sessionsOverview;
        },
        isLoading: function() {
            return this.$store.state.countlySessionsOverview.isLoading;
        },
        sessionsOverviewRows: function() {
            return this.$store.state.countlySessionsOverview.sessionsOverview.rows;
        }
    }
});

var SessionsOverviewView = countlyVue.views.BaseView.extend({
    template: "#sessions-overview",
    components: {
        "sessions-overview-date-picker": SessionsOverviewDatePicker,
        "sessions-overview-line-chart": SessionsOverviewLineChart,
        "sessions-overview-table": SessionsOverviewTable
    },
    data: function() {
        return {
            description: CV.i18n('sessions-overview.description')
        };
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySessionsOverview/fetchAll');
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionsOverview/fetchAll');
    },

});

var sessionsOverviewVuex = [{
    clyModel: countlySessionsOverview
}];

app.route("/analytics/sessions", "sessions", function() {
    var sessionsOverviewViewWrapper = new countlyVue.views.BackboneWrapper({
        component: SessionsOverviewView,
        vuex: sessionsOverviewVuex,
        templates: [ "/core/sessions-overview/templates/sessions-overview.html"]
    });
    this.renderWhenReady(sessionsOverviewViewWrapper);
});