<script>
import { mixins, templateUtil, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import AnnotationDrawer from '../../../../../frontend/express/public/core/notes/components/AnnotationDrawer.vue';

export default {
    template: templateUtil.stage('/dashboards/templates/widgets/analytics/widget.html'),
    mixins: [i18nMixin, mixins.customDashboards.global, mixins.customDashboards.widget, mixins.customDashboards.apps, mixins.zoom, mixins.hasDrawers("annotation"), mixins.graphNotesCommand],
    components: {
        "drawer": AnnotationDrawer
    },
    data: function() {
        return {
            selectedBucket: "daily",
            map: {
                "c": this.i18nM("events.table.count"),
                "s": this.i18nM("events.table.sum"),
                "dur": this.i18nM("events.table.dur")
            }
        };
    },
    computed: {
        title: function() {
            var title = this.i18nM("dashboards.widget-type.events");

            if (this.data.events && this.data.events.length === 1) {
                var parts = this.data.events[0].split("***");
                if (parts.length === 2 && this.data.dashData) {
                    if (this.data.dashData.naming && this.data.dashData.naming[parts[0]] && this.data.dashData.naming[parts[0]][parts[1]]) {
                        parts[1] = this.data.dashData.naming[parts[0]][parts[1]];
                    }

                    title = parts[1];
                }
            }

            return this.data.title || title;
        },
        showBuckets: function() {
            return false;
        },
        getTableData: function() {
            var segmentationDataset = this.getSegmentationDataset();
            if (segmentationDataset && Array.isArray(segmentationDataset.data)) {
                segmentationDataset.data.forEach(function(entry) {
                    if (typeof entry.dur === "number") {
                        entry.dur = countlyCommon.formatSecond(entry.dur);
                    }
                });
                return segmentationDataset.data;
            }
            return [];
        },
        tableStructure: function() {
            var segmentationDataset = this.getSegmentationDataset();
            return segmentationDataset && Array.isArray(segmentationDataset.data) ? this.buildSegmentationTableColumns(segmentationDataset) : [];
        },
        timelineGraph: function() {
            this.data = this.data || {};
            this.data.dashData = this.data.dashData || {};
            this.data.dashData.data = this.data.dashData.data || {};

            var series = [];
            var appIndex = 0;
            var multiApps = false;
            var multiEvents = false;

            var dates = [];
            if (Object.keys(this.data.dashData.data).length > 1) {
                multiApps = true;
            }
            for (var app in this.data.dashData.data) {
                var name;

                if (Object.keys(this.data.dashData.data[app]).length > 1) {
                    multiEvents = true;
                }
                else {
                    multiEvents = false;
                }
                for (var myevent in this.data.dashData.data[app]) {
                    var eventName = myevent;
                    if (this.data.dashData.naming && this.data.dashData.naming[app] && this.data.dashData.naming[app][myevent]) {
                        eventName = this.data.dashData.naming[app][myevent];
                    }
                    for (var k = 0; k < this.data.metrics.length; k++) {
                        if (multiApps) {
                            if (this.data.metrics.length > 1) {
                                name = eventName + " " + (this.map[this.data.metrics[k]] || this.data.metrics[k]) + " " + (this.__allApps[app] && this.__allApps[app].name || "Unknown");
                            }
                            else {
                                name = (eventName + " " + (this.__allApps[app] && this.__allApps[app].name || "Unknown"));
                            }
                        }
                        else {
                            if (multiEvents) {
                                name = (eventName + " " + this.map[this.data.metrics[k]] || this.data.metrics[k]);
                            }
                            else {
                                name = this.map[this.data.metrics[k]] || this.data.metrics[k];
                            }
                        }
                        series.push({ "data": [], "name": name, "app": app, "metric": this.data.metrics[k], "event": eventName, color: countlyCommon.GRAPH_COLORS[series.length]});
                    }

                    for (var date in this.data.dashData.data[app][myevent]) {
                        if (appIndex === 0) {
                            dates.push(date);
                        }
                        for (var kk = 0; kk < this.data.metrics.length; kk++) {
                            series[appIndex * this.data.metrics.length + kk].data.push(this.data.dashData.data[app][myevent][date][this.data.metrics[kk]] || 0);
                        }
                    }
                    appIndex++;
                }

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
                    lineOptions: {"series": series},
                };
            }
        },
        stackedBarOptions: function() {
            var segmentationDataset = this.getSegmentationDataset();
            return segmentationDataset && Array.isArray(segmentationDataset.data) ? this.buildSegmentationBarOptions(segmentationDataset) : null;
        },
        number: function() {
            var eventsObj = this.calculateNumberFromWidget(this.data);
            var vv = {};
            for (var z in eventsObj) {
                vv = eventsObj[z];
            }
            return vv;
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
                    label: this.map[series[i].event] || series[i].event
                });
            }

            return labels;
        }
    },
    methods: {
        refresh: function() {
            this.refreshNotes();
        },
        formatDuration: function(value) {
            return countlyCommon.formatSecond(value || 0);
        },
        getSegmentationDataset: function() {
            if (!this.data || !this.data.dashData || !this.data.dashData.data) {
                return null;
            }
            var appIds = Object.keys(this.data.dashData.data);
            if (!appIds.length) {
                return null;
            }
            var firstApp = appIds[0];
            var events = Object.keys(this.data.dashData.data[firstApp] || {});
            if (!events.length) {
                return null;
            }
            var dataset = this.data.dashData.data[firstApp][events[0]];
            if (dataset && Array.isArray(dataset.data)) {
                return dataset;
            }
            return null;
        },
        buildSegmentationTableColumns: function(dataset) {
            dataset = dataset || {};
            var metrics = Array.isArray(dataset.metrics) ? dataset.metrics : [];
            var columns = [{
                prop: "curr_segment",
                title: this.i18n("events.table.segmentation")
            }];
            for (var i = 0; i < metrics.length; i++) {
                var metricKey = metrics[i];
                var columnType = metricKey === "dur" ? "duration" : "number";
                columns.push({
                    prop: metricKey,
                    title: this.map[metricKey] || metricKey,
                    type: columnType
                });
            }
            return columns;
        },
        buildSegmentationBarOptions: function(dataset) {
            dataset = dataset || {};
            var metrics = Array.isArray(dataset.metrics) ? dataset.metrics : [];
            var metricKey = metrics.length ? metrics[0] : "c";
            var labels = [];
            var values = [];
            if (Array.isArray(dataset.data)) {
                dataset.data.forEach(function(entry) {
                    labels.push(entry.curr_segment || "");
                    values.push(entry[metricKey] || 0);
                });
            }
            var series = [{
                name: this.map[metricKey] || metricKey,
                data: values,
                color: this.data.bar_color
            }];
            return {
                xAxis: {data: labels},
                series: series
            };
        },
        onWidgetCommand: function(event) {
            if (event === 'add' || event === 'manage' || event === 'show') {
                this.graphNotesHandleCommand(event);
                return;
            }
            else if (event === 'zoom') {
                this.triggerZoom();
                return;
            }
            else {
                return this.$emit('command', event);
            }
        },
    }
};
</script>
