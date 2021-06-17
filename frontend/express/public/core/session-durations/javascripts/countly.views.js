/* global countlyVue,CV,countlySessionDurations,countlyCommon*/
var SessionDurationsView = countlyVue.views.create({
    template: CV.T("/core/session-durations/templates/session-durations.html"),
    data: function() {
        return {
            progressBarColor: "#017AFF"
        };
    },
    computed: {
        sessionDurations: function() {
            return this.$store.state.countlySessionDurations.sessionDurations;
        },
        isLoading: function() {
            return this.$store.state.countlySessionDurations.isLoading;
        },
        selectedDatePeriod: {
            get: function() {
                return this.$store.state.countlySessionDurations.selectedDatePeriod;
            },
            set: function(value) {
                this.$store.dispatch('countlySessionDurations/onSetSelectedDatePeriod', value);
                this.$store.dispatch('countlySessionDurations/fetchAll');
            }
        },
        sessionDurationsRows: function() {
            return this.$store.state.countlySessionDurations.sessionDurations.rows;
        },
        sessionDurationsOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionDurationsPeriods
                },
                series: this.yAxisSessionDurationsCountSeries
            };
        },
        xAxisSessionDurationsPeriods: function() {
            return this.$store.state.countlySessionDurations.sessionDurations.rows.map(function(tableRow) {
                return tableRow.duration;
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

countlyVue.container.registerTab("/analytics/sessions", {
    priority: 2,
    name: "durations",
    title: "Session Durations",
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/sessions/durations",
    component: SessionDurationsView,
    vuex: [{
        clyModel: countlySessionDurations
    }]
});