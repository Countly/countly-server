/*global countlyVue, countlyDashboards, CV */

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
                type: Object,
                default: function() {
                    return {};
                }
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
                return {};
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