/*global countlyVue, CV, countlyCommon, countlyGraphNotesCommon */

(function() {
    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/analytics/widget.html'),
        mixins: [countlyVue.mixins.customDashboards.global, countlyVue.mixins.customDashboards.widget, countlyVue.mixins.customDashboards.apps, countlyVue.mixins.zoom, countlyVue.mixins.hasDrawers("annotation"), countlyVue.mixins.graphNotesCommand],
        components: {
            "drawer": countlyGraphNotesCommon.drawer
        },
        data: function() {
            return {
                selectedBucket: "daily",
                map: {
                    "c": CV.i18nM("events.table.count"),
                    "s": CV.i18nM("events.table.sum"),
                    "dur": CV.i18nM("events.table.dur")
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
                this.data = this.data || {};
                var data = {"apps": [], dashData: {"data": {}}, "metrics": this.data.metrics, bar_color: this.data.bar_color};
                if (this.data && this.data.dashData && this.data.dashData.data) { //Single app 
                    for (var app in this.data.dashData.data) {
                        for (var event in this.data.dashData.data[app]) {
                            data.apps.push(app + event);
                            data.dashData.data[app + event] = this.data.dashData.data[app][event];
                        }
                    }
                }
                return this.calculateTableDataFromWidget(data);
            },
            tableStructure: function() {
                this.data = this.data || {};
                var data = {"apps": [], dashData: {"data": {}}, "metrics": this.data.metrics, bar_color: this.data.bar_color};
                if (this.data && this.data.dashData && this.data.dashData.data) { //Single app 
                    for (var app in this.data.dashData.data) {
                        for (var event in this.data.dashData.data[app]) {
                            data.apps.push(app + event);
                            data.dashData.data[app + event] = this.data.dashData.data[app][event];
                        }
                    }
                }
                return this.calculateTableColsFromWidget(data, this.map);
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
                this.data = this.data || {};
                var data = {dashData: {"data": {}}, "metrics": this.data.metrics, bar_color: this.data.bar_color};
                if (this.data && this.data.dashData && this.data.dashData.data) { //Single app 
                    for (var app in this.data.dashData.data) {
                        for (var event in this.data.dashData.data[app]) {
                            data.dashData.data[app + event] = this.data.dashData.data[app][event];
                        }
                    }
                }
                return this.calculateStackedBarOptionsFromWidget(data, this.map);
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
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#events-drawer",
        props: {
            scope: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        data: function() {
            return {
                metrics: [
                    { label: CV.i18nM("events.table.count"), value: "c" },
                    { label: CV.i18nM("events.table.sum"), value: "s" },
                    { label: CV.i18nM("events.table.dur"), value: "dur" }
                ]
            };
        },
        computed: {
            enabledVisualizationTypes: function() {
                if (this.scope.editedObject.app_count === 'multiple') {
                    return ['time-series'];
                }
                else {
                    return ['table', 'time-series', 'number', 'bar-chart'];
                }
            },
            isMultipleMetric: function() {
                var multiple = false;

                if (this.scope.editedObject.app_count === 'single') {
                    if (this.scope.editedObject.visualization === 'table' ||
                        this.scope.editedObject.visualization === 'time-series') {
                        multiple = true;
                    }
                }

                return multiple;
            },
            showEventsSelector: function() {
                if (this.scope.editedObject.apps && this.scope.editedObject.apps.length > 0) {
                    return true;
                }
                else {
                    return false;
                }
            },
            showBreakdown: function() {
                if (this.scope.editedObject.events && this.scope.editedObject.events.length > 0) {
                    return ["bar-chart", "table"].indexOf(this.scope.editedObject.visualization) > -1;
                }
                else {
                    return false;
                }
            },
            showPeriod: function() {
                return true;
            },
            isMultipleEvents: function() {
                return this.scope.editedObject.visualization === "time-series";
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "events",
        label: CV.i18nM("dashboards.widget-type.events"),
        priority: 2,
        primary: true,
        getter: function(widget) {
            return widget.widget_type === "events";
        },
        templates: [
            {
                namespace: "events",
                mapping: {
                    "drawer": "/dashboards/templates/widgets/events/drawer.html"
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    feature: "events",
                    widget_type: "events",
                    app_count: 'single',
                    apps: [],
                    visualization: "",
                    events: [],
                    metrics: [],
                    breakdowns: [],
                    custom_period: null

                };
            },
            beforeSaveFn: function(doc) {
                /**
                 * Sanitize the widget object before saving on the server
                 */
                if (["bar-chart", "table"].indexOf(doc.visualization) === -1) {
                    delete doc.breakdowns;
                }
            }
        },
        grid: {
            component: WidgetComponent
        }
    });
})();