/*global countlyVue, CV */

(function() {
    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/analytics/widget.html'), //using core dashboard widget template
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
                map: {
                    "countries": this.i18n("countries.title"),
                    "langs": this.i18n("languages.title")
                },
                tableMap: {
                    "u": this.i18n("common.table.total-users"),
                    "t": this.i18n("common.total-sessions"),
                    "n": this.i18n("common.table.new-users"),
                    "countries": this.i18n("countries.title"),
                    "langs": this.i18n("languages.table.language")
                }
            };
        },
        computed: {
            title: function() {
                if (this.data.title) {
                    return this.data.title;
                }
                if (this.data.dashData) {
                    return CV.i18n("dashboards.data-type.geo") + " (" + (this.map[this.data.breakdowns[0]] || this.data.breakdowns[0]) + ")";
                }
                return "";
            },
            showBuckets: function() {
                return false;
            },
            metricLabels: function() {
                return [];
            },
            getTableData: function() {
                return this.calculateTableDataFromWidget(this.data);
            },
            tableStructure: function() {
                return this.calculateTableColsFromWidget(this.data, this.tableMap);
            },
            stackedBarOptions: function() {
                return this.calculateStackedBarOptionsFromWidget(this.data, this.tableMap);
            },
            pieGraph: function() {
                return this.calculatePieGraphFromWidget(this.data, this.tableMap);
            }
        }
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#geo-drawer",
        props: {
            scope: {
                type: Object
            }
        },
        data: function() {
            return {};
        },
        computed: {
            metrics: function() {
                return [
                    { label: this.i18n("common.table.total-users"), value: "u" },
                    { label: this.i18n("common.table.new-users"), value: "n" },
                    { label: this.i18n("common.total-sessions"), value: "t" }
                ];
            },
            enabledVisualizationTypes: function() {
                return ['pie-chart', 'bar-chart', 'table'];
            },
            isMultipleMetric: function() {
                var multiple = false;
                var visualization = this.scope.editedObject.visualization;
                if (visualization === 'table') {
                    multiple = true;
                }

                return multiple;
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "analytics",
        label: CV.i18nM("dashboards.widget-type.analytics"),
        priority: 1,
        primary: false,
        getter: function(widget) {
            return widget.widget_type === "analytics" && widget.data_type === "geo";
        },
        templates: [
            {
                namespace: "geo",
                mapping: {
                    "drawer": "/core/geo-countries/templates/dashboard-widget/drawer.html"
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    widget_type: "analytics",
                    app_count: 'single',
                    data_type: "geo",
                    apps: [],
                    visualization: "",
                    custom_period: "30days",
                    metrics: ["t"],
                    breakdowns: ["countries"],
                    bar_color: 1
                };
            },
            beforeSaveFn: function(/*doc*/) {
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
            },
            onClick: function() {}
        }
    });
})();