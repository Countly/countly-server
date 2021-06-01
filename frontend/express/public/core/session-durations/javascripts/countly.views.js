/* global countlyVue,CV,countlySessionDurations,app*/
var SessionDurationsDatePicker = countlyVue.views.BaseView.extend({
    template: "#session-durations-date-picker",
    computed: {
        selectedDatePeriod: {
            get: function() {
                return this.$store.state.countlySessionDurations.selectedDatePeriod;
            },
            set: function(value) {
                this.$store.dispatch('countlySessionDurations/onSetSelectedDatePeriod', value);
                this.$store.dispatch('countlySessionDurations/fetchAll');
            }
        }
    }
});

var SessionDurationsLineChart = countlyVue.views.BaseView.extend({
    template: "#session-durations-line-chart",
    data: function() {
        return {
        };
    },
    computed: {
        sessionDurations: function() {
            return this.$store.state.countlySessionDurations.sessionDurations;
        },
        sessionDurationsOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionDurationsDatePeriods
                },
                series: this.yAxisSessionDurationsCountSeries
            };
        },
        xAxisSessionDurationsDatePeriods: function() {
            return this.$store.state.countlySessionDurations.sessionDurations.rows.map(function(tableRow) {
                return tableRow.date;
            });
        },
        yAxisSessionDurationsCountSeries: function() {
            return this.sessionDurations.series.map(function(sessionDurationsSerie) {
                return {
                    data: sessionDurationsSerie.data,
                    name: sessionDurationsSerie.label,
                };
            });
        },
        isLoading: function() {
            return this.$store.state.countlySessionDurations.isLoading;
        }
    }
});

var SessionDurationsTable = countlyVue.views.BaseView.extend({
    template: "#session-durations-table",
    data: function() {
        return {};
    },
    computed: {
        sessionDurations: function() {
            return this.$store.state.countlySessionDurations.sessionDuration;
        },
        isLoading: function() {
            return this.$store.state.countlySessionDurations.isLoading;
        },
        sessionDurationsRows: function() {
            return this.$store.state.countlySessionDurations.sessionDurations.rows;
        }
    }
});

var SessionDurationsView = countlyVue.views.BaseView.extend({
    template: "#session-durations",
    components: {
        "session-durations-date-picker": SessionDurationsDatePicker,
        "session-durations-line-chart": SessionDurationsLineChart,
        "session-durations-table": SessionDurationsTable
    },
    data: function() {
        return {
            description: CV.i18n('session-durations.description')
        };
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySessionDurations/fetchAll');
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionDurations/fetchAll');
    },
});

var sessionDurationsVuex = [{
    clyModel: countlySessionDurations
}];

app.route("/analytics/durations", "durations", function() {
    var sessionDurationsViewWrapper = new countlyVue.views.BackboneWrapper({
        component: SessionDurationsView,
        vuex: sessionDurationsVuex,
        templates: [ "/core/session-durations/templates/session-durations.html"]
    });
    this.renderWhenReady(sessionDurationsViewWrapper);
});