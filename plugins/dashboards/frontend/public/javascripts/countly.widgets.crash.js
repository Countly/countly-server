/*global countlyVue, CV */

(function() {
    var CrashComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/crash/widget.html'),
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
        template: CV.T('/dashboards/templates/widgets/crash/drawer.html'),
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
                    { label: this.i18n("dashboards.crf"), value: "crf" },
                    { label: this.i18n("dashboards.crnf"), value: "crnf" },
                    { label: this.i18n("dashboards.cruf"), value: "cruf" },
                    { label: this.i18n("dashboards.crunf"), value: "crunf" }
                ]
            };
        },
        computed: {
            enabledTypes: function() {
                /**
                 * Allowed visualization types for this widget are time-series and number
                 */

                if (this.scope.editedObject.app_count === 'single') {
                    return ['time-series', 'number'];
                }
                else {
                    return ['time-series'];
                }
            },
            isMultiple: function() {
                var multiple = false;

                if ((this.scope.editedObject.app_count === 'single') &&
                    (this.scope.editedObject.visualization === 'time-series')) {
                    multiple = true;
                }

                return multiple;
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "crash",
        label: CV.i18nM("dashboards.widget-type.crash"),
        priority: 11,
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    widget_type: "crash",
                    app_count: 'single',
                    apps: [],
                    metrics: [],
                    visualization: ""
                };
            },
        },
        grid: {
            component: CrashComponent,
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