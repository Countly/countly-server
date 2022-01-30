/*global countlyVue, CV */

(function() {
    var TimeSeriesComponent = countlyVue.views.create({
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
                var autoTitle = "Time series";
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
        },
        methods: {
            beforeCopy: function(data) {
                return data;
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
            enabledTypes: function() {
                if (this.scope.editedObject.app_count === 'multiple') {
                    return ['time-series'];
                }

                return [];
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "analytics",
        label: CV.i18nM("dashboards.widget-type.analytics"),
        priority: 1,
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
                };
            },
        },
        grid: {
            component: TimeSeriesComponent,
            dimensions: function() {
                return {
                    minWidth: 6,
                    minHeight: 2,
                    width: 6,
                    height: 3
                };
            },
            onClick: function() {}
        }
    });
})();