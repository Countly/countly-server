/*global countlyVue, CV */

(function() {
    var TimeSeriesComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/time-series/widget.html'),
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
        template: CV.T('/dashboards/templates/widgets/time-series/drawer.html'),
        props: {
            scope: {
                type: Object
            }
        },
        data: function() {
            return {
                appCount: 'single',
            };
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "time-series",
        label: CV.i18nM("dashboards.time-series"),
        priority: 1,
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    widget_type: "time-series",
                    data_type: "",
                    metrics: [],
                    apps: [],
                    visualization: "",
                    title: ""
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