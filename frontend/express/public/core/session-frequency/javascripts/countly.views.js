/* global countlyVue,CV,countlySessionFrequency,countlyCommon*/
var SessionFrequencyView = countlyVue.views.create({
    template: CV.T("/core/session-frequency/templates/session-frequency.html"),
    data: function() {
        return {
            progressBarColor: "#017AFF"
        };
    },
    computed: {
        sessionFrequency: function() {
            return this.$store.state.countlySessionFrequency.sessionFrequency;
        },
        isLoading: function() {
            return this.$store.state.countlySessionFrequency.isLoading;
        },
        selectedDatePeriod: {
            get: function() {
                return this.$store.state.countlySessionFrequency.selectedDatePeriod;
            },
            set: function(value) {
                this.$store.dispatch('countlySessionFrequency/onSetSelectedDatePeriod', value);
                this.$store.dispatch('countlySessionFrequency/fetchAll');
            }
        },
        sessionFrequencyRows: function() {
            return this.$store.state.countlySessionFrequency.sessionFrequency.rows;
        },
        sessionFrequencyOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionFrequency
                },
                series: this.yAxisSessionFrequencyCountSerie
            };
        },
        xAxisSessionFrequency: function() {
            return this.$store.state.countlySessionFrequency.sessionFrequency.rows.map(function(tableRow) {
                return tableRow.frequency;
            });
        },
        yAxisSessionFrequencyCountSerie: function() {
            return this.sessionFrequency.series.map(function(sessionFrequencySerie) {
                return {
                    data: sessionFrequencySerie.data,
                    name: sessionFrequencySerie.label,
                };
            });
        },
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySessionFrequency/fetchAll');
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionFrequency/fetchAll');
    },
});

countlyVue.container.registerTab("/analytics/sessions", {
    priority: 3,
    name: "frequency",
    title: "Session Frequency",
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/sessions/frequency",
    component: SessionFrequencyView,
    vuex: [{
        clyModel: countlySessionFrequency
    }]
});