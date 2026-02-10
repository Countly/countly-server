<script>
import { mixins, templateUtil } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

export default {
    template: templateUtil.stage('/dashboards/templates/widgets/analytics/widget.html'),
    mixins: [mixins.customDashboards.global, mixins.customDashboards.widget, mixins.customDashboards.apps, mixins.zoom, mixins.hasDrawers("annotation"), mixins.graphNotesCommand],
    components: {
        "drawer": (window.countlyGraphNotesCommon && window.countlyGraphNotesCommon.drawer) || {}
    },
    data: function() {
        return {
            selectedBucket: "daily",
            map: {
                "crf": this.i18n("dashboards.crf"),
                "crnf": this.i18n("dashboards.crnf"),
                "cruf": this.i18n("dashboards.cruf"),
                "crunf": this.i18n("dashboards.crunf")
            }
        };
    },
    computed: {
        title: function() {
            var autoTitle = "Crashes";
            return this.data.title || autoTitle;
        },
        showBuckets: function() {
            return false;
        },
        timelineGraph: function() {
            this.data = this.data || {};
            this.data.dashData = this.data.dashData || {};
            this.data.dashData.data = this.data.dashData.data || {};

            var series = [];
            var appIndex = 0;
            var multiApps = this.data.app_count === "multiple" ? true : false;

            var dates = [];

            for (var app in this.data.dashData.data) {
                var name;
                for (var k = 0; k < this.data.metrics.length; k++) {
                    if (multiApps) {
                        if (this.data.metrics.length > 1) {
                            name = (this.map[this.data.metrics[k]] || this.data.metrics[k]) + " " + (this.__allApps[app] && this.__allApps[app].name || "Unknown");
                        }
                        else {
                            name = (this.__allApps[app] && this.__allApps[app].name || "Unknown");
                        }
                    }
                    else {
                        name = (this.map[this.data.metrics[k]] || this.data.metrics[k]);
                    }
                    series.push({ "data": [], "name": name, "app": app, "metric": this.data.metrics[k], color: countlyCommon.GRAPH_COLORS[series.length]});
                }

                for (var date in this.data.dashData.data[app]) {
                    if (appIndex === 0) {
                        dates.push(date);
                    }
                    for (var kk = 0; kk < this.data.metrics.length; kk++) {
                        series[appIndex * this.data.metrics.length + kk].data.push(this.data.dashData.data[app][date][this.data.metrics[kk]] || 0);
                    }
                }
                appIndex++;
            }
            if (this.data.custom_period) {
                return {
                    lineOptions: {xAxis: { data: dates}, "series": series}
                };
            }
            else if (countlyCommon && countlyCommon.periodObj && countlyCommon.periodObj.daysInPeriod === 1 && countlyCommon.periodObj.isSpecialPeriod === true) {
                dates = [dates[0] + " 00:00", dates[0] + " 24:00"];
                for (var z = 0; z < series.length; z++) {
                    series[z].data.push(series[z].data[0]);
                }
                return {
                    lineOptions: {xAxis: { data: dates}, "series": series}
                };
            }
            else {
                return {
                    lineOptions: {"series": series}
                };
            }
        },
        number: function() {
            return this.calculateNumberFromWidget(this.data);
        },
        metricLabels: function() {
            this.data = this.data || {};
            var listed = [];

            for (var k = 0; k < this.data.metrics.length; k++) {
                listed.push(this.map[this.data.metrics[k]] || this.data.metrics[k]);
            }
            return listed;
        },
        legendLabels: function() {
            var labels = {};

            var graphData = this.timelineGraph;
            var series = graphData.lineOptions.series;

            for (var i = 0; i < series.length; i++) {
                if (!labels[series[i].app]) {
                    labels[series[i].app] = [];
                }

                labels[series[i].app].push({
                    appId: series[i].app,
                    color: series[i].color,
                    label: this.map[series[i].metric] || series[i].metric
                });
            }

            return labels;
        }
    },
    methods: {
        refresh: function() {
            this.refreshNotes();
        },
        onWidgetCommand: function(event) {
            if (event === 'zoom') {
                this.triggerZoom();
                return;
            }
            else if (event === 'add' || event === 'manage' || event === 'show') {
                this.graphNotesHandleCommand(event);
                return;
            }
            else {
                return this.$emit('command', event);
            }
        },
    }
};
</script>
