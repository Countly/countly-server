/*global countlyVue, countlyDashboards, CV */

(function() {
    var NumberComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/number.html'),
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
        template: "<div>{{scope.editedObject.widget_type}}</div>",
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
        dimensions: function() {
            return {
                minWidth: 2,
                minHeight: 2,
                width: 2,
                height: 3
            };
        },
        gridComponent: NumberComponent,
        drawerComponent: DrawerComponent,
    });
})();