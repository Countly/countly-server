/* global countlyVue,CV,countlySessionDurations*/
var SessionDurationsView = countlyVue.views.create({
    template: CV.T("/core/session-durations/templates/session-durations.html"),
    mixins: [countlyVue.mixins.commonFormatters],
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
            return this.$store.getters['countlySessionDurations/isLoading'];
        },
        sessionDurationsRows: function() {
            return this.$store.state.countlySessionDurations.sessionDurations.rows;
        },
        sessionDurationsOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionDurationsPeriods,
                    axisLabel: {
                        color: "#333C48"
                    }
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
            this.$store.dispatch('countlySessionDurations/fetchAll', false);
        },
        dateChanged: function() {
            this.$store.dispatch('countlySessionDurations/fetchAll', true);
        },
        sortDurationBuckets: function(a, b) {
            return a.weight - b.weight;
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionDurations/fetchAll', true);
    },
});

countlyVue.container.registerTab("/analytics/sessions", {
    priority: 2,
    name: "durations",
    permission: "core",
    title: CV.i18n('session-durations.title'),
    route: "#/analytics/sessions/durations",
    dataTestId: "session-durations",
    component: SessionDurationsView,
    vuex: [{
        clyModel: countlySessionDurations
    }]
});