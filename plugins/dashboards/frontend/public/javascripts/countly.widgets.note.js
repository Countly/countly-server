/*global countlyVue, countlyDashboards, CV */

(function() {
    var NoteComponent = countlyVue.views.create({
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
        label: CV.i18nM("dashboards.note"),
        priority: 5,
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    content: ""
                };
            },
        },
        grid: {
            component: NoteComponent,
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