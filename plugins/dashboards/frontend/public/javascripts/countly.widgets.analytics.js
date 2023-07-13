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
                return this.calculateTableDataFromWidget(this.data);
            },
            tableStructure: function() {
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
        },
        methods: {
            beforeCopy: function(data) {
                return data;
            },
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
        },
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#analytics-drawer",
        props: {
            scope: {
                type: Object
            }
        },
        data: function() {
            return {
                metricLists: {
                    "session": [
                        { label: this.i18n("common.total-sessions"), value: "t" },
                        { label: this.i18n("common.unique-sessions"), value: "u" },
                        { label: this.i18n("common.new-sessions"), value: "n" }
                    ]
                }
            };
        },
        computed: {
            enabledVisualizationTypes: function() {
                if (this.scope.editedObject.app_count === 'multiple') {
                    return ['time-series'];
                }

                return ['time-series', 'table', 'bar-chart', 'number'];
            },
            isMultipleMetric: function() {
                var multiple = false;
                var appCount = this.scope.editedObject.app_count;
                var visualization = this.scope.editedObject.visualization;

                if (appCount === 'single') {
                    if (visualization === 'table' || visualization === 'time-series') {
                        multiple = true;
                    }
                }

                return multiple;
            },
            metrics: function() {
                return this.metricLists[this.scope.editedObject.data_type];
            },
            showBreakdown: function() {
                return ["bar-chart", "table"].indexOf(this.scope.editedObject.visualization) > -1;
            },
            showPeriod: function() {
                return true;
            }
        },
        methods: {
            onDataTypeChange: function(v) {
                var widget = this.scope.editedObject;
                this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
            }
        }
    });

    /**
     * Set primary: true since Analytics widget can have multiple registrations of
     * type analytics. But among all of them only one should be primary.
     * We have chosen Analytics widget with data_type = session to be primary.
     * For other registrations of type analytics, we set primary: false.
     *
     * Set getter to return this widget registration object.
     * The returned value should be a boolean.
     * It should be something unique for each widget registration.
     * Getter accepts the widget data object as an argument.
     * Based on the data you can decide if this registration should be returned or not.
     * Please don't mutate the widget data object passed in the argument to the getter.
     */
    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "analytics",
        label: CV.i18nM("dashboards.widget-type.analytics"),
        priority: 1,
        primary: true,
        getter: function(widget) {
            return widget.widget_type === "analytics" && widget.data_type === "session";
        },
        templates: [
            {
                namespace: "analytics",
                mapping: {
                    "drawer": "/dashboards/templates/widgets/analytics/drawer.html"
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    feature: "core",
                    widget_type: "analytics",
                    app_count: 'single',
                    data_type: "session",
                    metrics: [],
                    apps: [],
                    visualization: "",
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
            component: WidgetComponent,
            onClick: function() {}
        }
    });
})();