/* global countlyVue,CV,countlySessionFrequency*/
var SessionFrequencyView = countlyVue.views.create({
    template: CV.T("/core/session-frequency/templates/session-frequency.html"),
    mixins: [countlyVue.mixins.commonFormatters],
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
            return this.$store.getters['countlySessionFrequency/isLoading'];
        },
        sessionFrequencyRows: function() {
            return this.$store.state.countlySessionFrequency.sessionFrequency.rows;
        },
        sessionFrequencyOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionFrequency,
                    axisLabel: {
                        color: "#333C48"
                    }
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
            this.$store.dispatch('countlySessionFrequency/fetchAll', false);
        },
        dateChanged: function() {
            this.$store.dispatch('countlySessionFrequency/fetchAll', true);
        },
        sortFrequencyBuckets: function(a, b) {
            return a.weight - b.weight;
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionFrequency/fetchAll', true);
    },
});

countlyVue.container.registerTab("/analytics/sessions", {
    priority: 3,
    name: "frequency",
    permission: "core",
    title: CV.i18n('session-frequency.title'),
    route: "#/analytics/sessions/frequency",
    dataTestId: "session-frequency",
    component: SessionFrequencyView,
    vuex: [{
        clyModel: countlySessionFrequency
    }]
});