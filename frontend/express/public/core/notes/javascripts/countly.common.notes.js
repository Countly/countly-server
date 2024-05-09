/*global CV,countlyVue, CountlyHelpers, countlyGraphNotes, countlyCommon*/
(function(countlyGraphNotesCommon) {
    countlyGraphNotesCommon.COLOR_TAGS = [{
        value: 1,
        label: "#39C0C8"
    },
    {
        value: 2,
        label: "#F5C900"
    },
    {
        value: 3,
        label: "#F96300"
    },
    {
        value: 4,
        label: "#F34971"
    },
    {
        value: 5,
        label: "#6C47FF"
    }];

    countlyGraphNotesCommon.drawer = countlyVue.views.create({
        template: CV.T('/core/notes/templates/annotationDrawer.html'),
        data: function() {
            return {
                noteTypes: [{label: "Private", value: "private"}, {label: "Shared", value: "shared"}, {label: "Public", value: "public"}],
                colorTag: countlyGraphNotesCommon.COLOR_TAGS,
                defaultTag: {
                    value: 1,
                    label: "#39C0C8"
                }
            };
        },
        props: {
            settings: Object,
            controls: Object
        },
        methods: {
            onSubmit: function(doc) {
                var self = this;
                countlyGraphNotes.save(doc, function(res) {
                    if (res.result === "success") {
                        CountlyHelpers.notify({
                            type: 'success',
                            title: CV.i18n('common.success'),
                            message: CV.i18n('notes.created-message')
                        });
                    }
                    else {
                        CountlyHelpers.notify({
                            type: 'error',
                            title: CV.i18n('common.error'),
                            message: res.message
                        });
                    }
                    self.$emit("cly-refresh", true);
                });
            },
            onOpen: function() {
                countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID]);
            }
        },
    });

})(window.countlyGraphNotesCommon = window.countlyGraphNotesCommon || {});