/*global countlyVue, CV */

(function() {
    var EventsComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/events/widget.html'),
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
        template: CV.T('/dashboards/templates/widgets/events/drawer.html'),
        props: {
            scope: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        data: function() {
            return {
                metrics: [
                    { label: this.i18n("events.table.count"), value: "c" },
                    { label: this.i18n("events.table.sum"), value: "s" },
                    { label: this.i18n("events.table.dur"), value: "dur" }
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
        type: "events",
        label: CV.i18nM("dashboards.widget-type.events"),
        priority: 2,
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    widget_type: "events",
                    app_count: 'single',
                    apps: [],
                    metrics: [],
                    visualization: ""
                };
            },
        },
        grid: {
            component: EventsComponent,
            dimensions: function() {
                return {
                    minWidth: 6,
                    minHeight: 3,
                    width: 6,
                    height: 3
                };
            }
        }
    });
})();