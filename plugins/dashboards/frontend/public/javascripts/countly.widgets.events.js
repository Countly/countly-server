/*global countlyVue, CV */

(function() {
    var WidgetComponent = countlyVue.views.create({
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
            enabledVisualizationTypes: function() {
                if (this.scope.editedObject.app_count === 'multiple') {
                    return ['time-series'];
                }

                return [];
            },
            isMultipleMetric: function() {
                var multiple = false;

                if (this.scope.editedObject.app_count === 'single') {
                    if (this.scope.editedObject.visualization === 'table' ||
                        this.scope.editedObject.visualization === 'time-series') {
                        multiple = true;
                    }
                }

                return multiple;
            },
            showBreakdown: function() {
                return ["bar-chart", "table"].indexOf(this.scope.editedObject.visualization) > -1;
            },
            isMultipleEvents: function() {
                return this.scope.editedObject.visualization === "time-series";
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "events",
        label: CV.i18nM("dashboards.widget-type.events"),
        priority: 2,
        primary: true,
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    widget_type: "events",
                    app_count: 'single',
                    apps: [],
                    visualization: "",
                    events: [],
                    metrics: [],
                    breakdowns: []
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
            }
        }
    });
})();