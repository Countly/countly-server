<template>
    <base-widget
        :data="data"
        :loading="loading"
        :is-allowed="isAllowed"
        :title="title"
        :show-buckets="showBuckets"
        :selected-bucket="selectedBucket"
        :timeline-graph="timelineGraph"
        :number="number"
        :table-data="getTableData"
        :table-structure="tableStructure"
        :stacked-bar-options="stackedBarOptions"
        :metric-labels="metricLabels"
        :legend-labels="legendLabels"
        @command="$emit('command', $event)"
    />
</template>
<script>
import { i18nMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import BaseWidget from './BaseWidget.vue';

export default {
    components: {
        BaseWidget
    },
    mixins: [
        mixins.customDashboards.global,
        mixins.customDashboards.widget,
        mixins.customDashboards.apps,
        i18nMixin
    ],
    data: function() {
        return {
            selectedBucket: "daily",
            map: {
                "t": this.i18n("common.total-sessions"),
                "u": this.i18n("common.unique-sessions"),
                "n": this.i18n("common.new-sessions")
            },
        };
    },
    computed: {
        title: function() {
            var autoTitle = "Analytics";
            return this.data.title || autoTitle;
        },
        showBuckets: function() {
            return false;
        },
        getTableData: function() {
            var dd = (this.data.dashData && this.data.dashData.data) || {};
            if (!Object.keys(dd).length) {
                return [];
            }
            return this.calculateTableDataFromWidget(this.data);
        },
        tableStructure: function() {
            var dd = (this.data.dashData && this.data.dashData.data) || {};
            if (!Object.keys(dd).length) {
                return [];
            }
            return this.calculateTableColsFromWidget(this.data, this.map);
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
            else if (countlyCommon.periodObj.daysInPeriod === 1 && countlyCommon.periodObj.isSpecialPeriod === true) {
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
        stackedBarOptions: function() {
            return this.calculateStackedBarOptionsFromWidget(this.data, this.map);
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
    }
};
</script>
