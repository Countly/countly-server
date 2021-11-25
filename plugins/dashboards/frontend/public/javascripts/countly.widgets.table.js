/*global countlyVue, countlyDashboards, CV */

(function() {
    var TableComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/table/widget.html'),
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
        template: CV.T('/dashboards/templates/widgets/table/drawer.html'),
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
        type: "table",
        label: CV.i18nM("dashboards.table"),
        priority: 4,
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {};
            },
        },
        grid: {
            component: TableComponent,
            dimensions: function() {
                return {
                    minWidth: 4,
                    minHeight: 4,
                    width: 4,
                    height: 4
                };
            }
        }
    });
})();