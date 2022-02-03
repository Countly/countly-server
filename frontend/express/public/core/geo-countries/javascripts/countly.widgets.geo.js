/*global countlyVue, CV */

(function() {
    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/core/geo-countries/templates/dashboard-widget/widget.html'),
        props: {
            data: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        data: function() {
            return {};
        },
        computed: {
            title: function() {
                return "Geo";
            }
        }
    });

    var DrawerComponent = countlyVue.views.create({
        template: CV.T('/core/geo-countries/templates/dashboard-widget/drawer.html'),
        props: {
            scope: {
                type: Object
            }
        },
        data: function() {
            return {};
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
                };
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