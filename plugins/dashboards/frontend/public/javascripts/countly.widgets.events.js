/*global countlyVue,countlyGlobal, CV */

(function() {
    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/analytics/widget.html'),
        mixins: [countlyVue.mixins.DashboardsHelpersMixin],
        props: {
            data: {
                type: Object,
                default: function() {
                    return {};
                }
            }
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
                var autoTitle = CV.i18nM("dashboards.widget-type.events");
                return this.data.title || autoTitle;
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

                var legend = {"type": "primary", data: []};
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

                        for (var k = 0; k < this.data.metrics.length; k++) {
                            if (multiApps) {
                                if (this.data.metrics.length > 1) {
                                    name = myevent + " " + (this.map[this.data.metrics[k]] || this.data.metrics[k]) + " " + (countlyGlobal.apps[app].name || "");
                                }
                                else {
                                    name = (myevent + " " + countlyGlobal.apps[app].name || "");
                                }
                            }
                            else {
                                if (multiEvents) {
                                    name = (myevent + " " + this.map[this.data.metrics[k]] || this.data.metrics[k]);
                                }
                                else {
                                    name = this.map[this.data.metrics[k]] || this.data.metrics[k];
                                }
                            }
                            series.push({ "data": [], "name": name, "app": app, "metric": this.data.metrics[k], "event": myevent});
                            legend.data.push({"name": name, "app": app, "metric": this.data.metrics[k], "event": myevent});
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
                        lineOptions: {xAxis: { data: dates}, "series": series},
                        lineLegend: legend
                    };
                }
                else {
                    return {
                        lineOptions: {"series": series},
                        lineLegend: legend
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
                return this.calculateStackedBarOptionsFromWidget(data);
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
            }
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
            showBreakdown: function() {
                return ["bar-chart", "table"].indexOf(this.scope.editedObject.visualization) > -1;
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
                    widget_type: "events",
                    app_count: 'single',
                    apps: [],
                    visualization: "",
                    events: [],
                    metrics: [],
                    breakdowns: [],

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
            component: WidgetComponent,
            dimensions: function() {
                return {
                    minWidth: 6,
                    minHeight: 3,
                    width: 6,
                    height: 3
                };
            }
        }
    });
})();