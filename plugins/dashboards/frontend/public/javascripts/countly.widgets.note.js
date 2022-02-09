/*global countlyVue, CV */

(function() {
    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/note/widget.html'),
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
        template: CV.T('/dashboards/templates/widgets/note/drawer.html'),
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
                constants: {
                    textDecorations: [
                        {
                            name: this.i18nM["dashboards.bold"],
                            value: "b"
                        },
                        {
                            name: this.i18nM["dashboards.italic"],
                            value: "i"
                        },
                        {
                            name: this.i18nM["dashboards.underline"],
                            value: "u"
                        }
                    ]
                }
            };
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "note",
        label: CV.i18nM("dashboards.widget-type.note"),
        priority: 5,
        primary: true,
        getter: function(widget) {
            return widget.widget_type === "note";
        },
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    widget_type: "note",
                    content: "",
                    apps: "*"
                };
            },
        },
        grid: {
            component: WidgetComponent,
            dimensions: function() {
                return {
                    minWidth: 1,
                    minHeight: 3,
                    width: 1,
                    height: 3
                };
            }
        }
    });
})();