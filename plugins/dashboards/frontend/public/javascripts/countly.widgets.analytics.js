/*global countlyVue, CV */

(function() {
    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/analytics/widget.html'),
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
                selectedBucket: "daily"
            };
        },
        computed: {
            title: function() {
                var autoTitle = "Analytics";
                return this.data.title || autoTitle;
            },
            apps: function() {
                var apps = this.data.apps;
                var appData = [];

                for (var i = 0; i < apps.length; i++) {
                    var appId = apps[i];
                    appData.push({
                        id: appId,
                        name: this.getAppName(appId)
                    });
                }
            }
        }
    });

    var DrawerComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/analytics/drawer.html'),
        props: {
            scope: {
                type: Object
            }
        },
        data: function() {
            return {
                sessionMetrics: [
                    { label: this.i18n("sidebar.analytics.sessions"), value: "t" },
                    { label: this.i18n("sidebar.analytics.users"), value: "u" },
                    { label: this.i18n("common.table.new-users"), value: "n" }
                ]
            };
        },
        computed: {
            enabledVisualizationTypes: function() {
                if (this.scope.editedObject.app_count === 'multiple') {
                    return ['time-series'];
                }

                return [];
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
            showBreakdown: function() {
                return ["bar-chart", "table"].indexOf(this.scope.editedObject.visualization) > -1;
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
     */
    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "analytics",
        label: CV.i18nM("dashboards.widget-type.analytics"),
        priority: 1,
        primary: true,
        getter: function(widget) {
            return widget.widget_type === "analytics" && widget.data_type === "session";
        },
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    widget_type: "analytics",
                    app_count: 'single',
                    data_type: "session",
                    metrics: [],
                    apps: [],
                    visualization: "",
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
            },
            onClick: function() {}
        }
    });
})();