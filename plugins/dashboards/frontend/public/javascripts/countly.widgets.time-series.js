/*global countlyVue, countlyDashboards, CV */

(function() {
    var TimeSeriesComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/time-series/widget.html'),
        mixins: [countlyDashboards.mixins.AppsMixin],
        props: {
            data: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        computed: {
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
        components: {
            'select-metric': countlyDashboards.components.MetricComponent,
            'select-data-type': countlyDashboards.components.DataTypeComponent,
            'app-count': countlyDashboards.components.AppCountComponent,
            'source-apps': countlyDashboards.components.SourceAppsComponent
        },
        props: {
            scope: {
                type: Object
            }
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
                    data_type: "",
                    metrics: [],
                    apps: []
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
            }
        }
    });
})();