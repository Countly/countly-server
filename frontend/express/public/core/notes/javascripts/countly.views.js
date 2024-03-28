/*global CV, countlyVue, app, CountlyHelpers, countlyCommon, countlyGraphNotes, countlyGraphNotesCommon */
(function() {
    var GraphNotesComponent = countlyVue.views.create({
        template: CV.T("/core/notes/templates/main.html"),
        data: function() {
            return {
                deleteDialogTitle: CV.i18n('management-users.warning'),
                deleteDialogText: "",
                deleteDialogConfirmText: CV.i18n('common.ok'),
                showDeleteDialog: false,
                drawerSettings: {
                    createTitle: CV.i18n('notes.add-new-note'),
                    editTitle: CV.i18n('notes.edit-note'),
                    saveButtonLabel: CV.i18n('common.save'),
                    createButtonLabel: CV.i18n('common.create'),
                    isEditMode: false
                },
                notes: [],
                typeList: [
                    {value: "all", label: CV.i18n('notes.all-notes')},
                    {value: "private", label: "Private"},
                    {value: "shared", label: "Shared"},
                    {value: "public", label: "Public"}
                ],
                defaultType: 'all'
            };
        },
        mixins: [countlyVue.mixins.hasDrawers("annotation"), countlyVue.mixins.commonFormatters],
        components: {
            drawer: countlyGraphNotesCommon.drawer
        },
        mounted: function() {
        },
        computed: {
            selectedType: {
                get: function() {
                    return this.defaultType;
                },
                set: function(value) {
                    this.defaultType = value;
                    var self = this;
                    var filter = {};
                    if (value !== "all") {
                        filter = {noteType: value};
                    }
                    countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID], filter, function(data) {
                        self.notes = data;
                    });
                }
            }
        },
        methods: {
            refresh: function(force) {
                var self = this;
                if (force) {
                    countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID], {}, function(data) {
                        self.notes = data;
                    });
                }
            },
            decodeHtml: function(str) {
                return countlyCommon.unescapeHtml(str);
            },
            handleCommand: function(command, data) {
                switch (command) {
                case "delete":
                    this.deleteDialogText = CV.i18n('notes.delete-note', data.note);
                    this.noteToDialog = data._id;
                    this.showDeleteDialog = true;
                    break;
                case 'edit':
                    data.color = {value: data.color};
                    this.drawerSettings.isEditMode = true;
                    data.note = countlyCommon.unescapeHtml(data.note);
                    this.openDrawer("annotation", data);
                    break;
                default:
                    break;
                }
            },
            createNote: function() {
                this.openDrawer("annotation", {
                    noteType: "private",
                    ts: Date.now(),
                    color: {value: 1, label: '#39C0C8'},
                    emails: [],
                    category: this.category
                });
            },
            submitDeleteForm: function() {
                this.showDeleteDialog = false;
                var self = this;
                if (this.noteToDialog) {
                    countlyGraphNotes.delete(this.noteToDialog, function(res) {
                        if (res.result === "success") {
                            CountlyHelpers.notify({
                                type: 'success',
                                message: CV.i18n('common.success')
                            });
                        }
                        else {
                            CountlyHelpers.notify({
                                type: 'error',
                                title: CV.i18n('common.error'),
                                message: res.message
                            });
                        }
                        self.refresh(true);
                    });
                }
            },
            dateFormatter: function(row, col, value) {
                if (!value) {
                    return '';
                }
                return countlyCommon.getDate(value);
            },
            closeDeleteForm: function() {
                this.showDeleteDialog = false;
            },
        },
        created: function() {
            this.refresh(true);
        }
    });

    app.route("/analytics/graph-notes", "graphNotes", function() {
        var graphNotesView = new countlyVue.views.BackboneWrapper({
            component: GraphNotesComponent,
            templates: [
                "/core/notes/templates/main.html",
            ]
        });
        this.renderWhenReady(graphNotesView);
    });
})();
