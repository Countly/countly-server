/*global countlyVue, countlyDashboards, CV */

(function() {
    var NoteComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/note.html'),
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
        template: CV.T('/dashboards/templates/widgets/note-drawer.html'),
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
        type: "note",
        label: CV.i18nM("dashboards.note"),
        priority: 5,
        dimensions: function() {
            return {
                minWidth: 6,
                minHeight: 2,
                width: 6,
                height: 3
            };
        },
        gridComponent: NoteComponent,
        drawerComponent: DrawerComponent
    });
})();