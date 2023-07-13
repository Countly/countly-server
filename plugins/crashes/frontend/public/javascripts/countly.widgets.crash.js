/*global countlyVue, CV, countlyCommon, countlyGraphNotesCommon*/

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
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#crash-drawer",
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
                    { label: this.i18n("dashboards.crf"), value: "crf" },
                    { label: this.i18n("dashboards.crnf"), value: "crnf" },
                    { label: this.i18n("dashboards.cruf"), value: "cruf" },
                    { label: this.i18n("dashboards.crunf"), value: "crunf" }
                ]
            };
        },
        computed: {
            enabledVisualizationTypes: function() {
                /**
                 * Allowed visualization types for this widget are time-series and number
                 */

                if (this.scope.editedObject.app_count === 'single') {
                    return ['time-series', 'number'];
                }
                else {
                    return ['time-series'];
                }
            },
            isMultipleMetric: function() {
                var multiple = false;

                if ((this.scope.editedObject.app_count === 'single') &&
                    (this.scope.editedObject.visualization === 'time-series')) {
                    multiple = true;
                }

                return multiple;
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "crashes",
        label: CV.i18nM("dashboards.widget-type.crash"),
        priority: 11,
        primary: true,
        getter: function(widget) {
            return widget.widget_type === "crashes";
        },
        templates: [
            {
                namespace: "crash",
                mapping: {
                    "drawer": "/crashes/templates/dashboard-widget/drawer.html"
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    feature: "crashes",
                    widget_type: "crashes",
                    app_count: 'single',
                    apps: [],
                    metrics: [],
                    visualization: "",
                    isPluginWidget: true
                };
            },
        },
        grid: {
            component: WidgetComponent
        }
    });
})();