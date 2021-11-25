/*global countlyVue, countlyDashboards, CV */

(function() {
    var NumberComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/number/widget.html'),
        props: {
            data: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        }
    });

    var DrawerComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/number/drawer.html'),
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
        type: "number",
        label: CV.i18nM("dashboards.number"),
        priority: 3,
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {};
            },
        },
        grid: {
            component: NumberComponent,
            dimensions: function() {
                return {
                    minWidth: 2,
                    minHeight: 2,
                    width: 2,
                    height: 3
                };
            }
        }
    });
})();