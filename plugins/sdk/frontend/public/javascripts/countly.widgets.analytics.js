/*global countlyVue, CV, countlyCommon, countlyGraphNotesCommon, countlySDK */

(function() {
    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/sdk/templates/widgets/analytics/widget.html'),
        mixins: [countlyVue.mixins.customDashboards.global, countlyVue.mixins.customDashboards.widget, countlyVue.mixins.customDashboards.apps, countlyVue.mixins.zoom, countlyVue.mixins.hasDrawers("annotation"), countlyVue.mixins.graphNotesCommand],
        components: {
            "drawer": countlyGraphNotesCommon.drawer
        },
        data: function() {
            return {
                selectedBucket: "daily",
                map: {
                    "t": this.i18n("common.total-sessions"),
                    "u": this.i18n("common.table.total-users"),
                    "n": this.i18n("common.new-sessions")
                },
            };
        },
        computed: {
            title: function() {
                var autoTitle = "SDK Analytics";
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
            stackedBarTimeSeriesOptions: function() {
                return this.calculateStackedBarTimeSeriesOptionsFromWidget(this.data, this.tableMap);
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
            valFormatter: function(val) {
                if (this.data.displaytype !== "value") {
                    return val + " %";
                }
                return val;
            },
        },
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#sdk-drawer",
        props: {
            scope: {
                type: Object
            }
        },
        data: function() {
            return {
                metricLists: {
                    "sdk": [
                        { label: this.i18n("common.total-sessions"), value: "t" },
                        { label: this.i18n("common.table.total-users"), value: "u" },
                        { label: this.i18n("common.new-sessions"), value: "n" }
                    ]
                },
                sdkListLoading: false,
                availableSDKs: [],
            };
        },
        computed: {
            enabledVisualizationTypes: function() {
                return ['time-series', 'table', 'bar-chart'];
            },
            isMultipleMetric: function() {
                var multiple = false;
                var visualization = this.scope.editedObject.visualization;
                if (visualization === 'table') {
                    multiple = true;
                }

                return multiple;
            },
            showDisplayType: function() {
                var show = false;
                var visualization = this.scope.editedObject.visualization;
                if (visualization === 'time-series') {
                    show = true;
                }
                return show;
            },
            metrics: function() {
                return this.metricLists[this.scope.editedObject.data_type];
            },
            showBreakdown: function() {
                return false;
            },
            showPeriod: function() {
                return true;
            },
            selectedSingleSDK: {
                get: function() {
                    return this.scope.editedObject.selectedSDK;
                },
                set: function(val) {
                    this.scope.editedObject.selectedSDK = val;
                }
            },
        },
        methods: {
            onDataTypeChange: function(v) {
                var widget = this.scope.editedObject;
                this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
            },
            loadSDKList: function(selectedAppId) {
                var self = this;
                self.selectedSingleSDK = "";
                if (!selectedAppId) {
                    self.availableSDKs = [];
                }
                else {
                    self.sdkListLoading = true;
                    countlySDK.loadListOfSDKs(selectedAppId, function(res) {
                        var list = res && res.meta && res.meta.sdks || [];
                        self.availableSDKs = list.map(function(key) {
                            return {
                                label: key,
                                value: key,
                            };
                        });
                        self.sdkListLoading = false;
                    });
                }
            },
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
        type: "sdk",
        label: "SDK Analytics",
        priority: 100,
        primary: true,
        getter: function(widget) {
            return widget.widget_type === "sdk";
        },
        templates: [
            {
                namespace: "sdk",
                mapping: {
                    "drawer": "/sdk/templates/widgets/analytics/drawer.html"
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    feature: "sdk",
                    widget_type: "sdk",
                    data_type: "sdk",
                    metrics: [],
                    apps: [],
                    selectedApp: "",
                    visualization: "",
                    displaytype: "",
                    custom_period: null,
                    selectedSDK: ""
                };
            },
            beforeLoadFn: function(doc, isEdited) {
                if (isEdited) {
                    doc.selectedApp = doc.apps[0];
                }
            },
            beforeSaveFn: function(doc) {
                doc.apps = [doc.selectedApp];
                delete doc.selectedApp;
            }
        },
        grid: {
            component: WidgetComponent,
            onClick: function() {}
        }
    });
})();