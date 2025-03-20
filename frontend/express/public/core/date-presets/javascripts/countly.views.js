/*global Vue app, countlyVue, CV, countlyGlobal, groupsModel, _, CountlyHelpers, countlyPresets, countlyAuth*/

(function() {

    var AUTHENTIC_GLOBAL_ADMIN = (countlyGlobal.member.global_admin && ((countlyGlobal.member.restrict || []).indexOf("#/manage/configurations") < 0));

    const sharingOptions = [
        {
            value: "all-users",
            name: CV.i18n("management.preset.visibility.all-users")
        },
        {
            value: "selected-users",
            name: CV.i18n("management.preset.visibility.selected-users"),
        },
        {
            value: "none",
            name: CV.i18n("management.preset.visibility.none")
        }
    ];

    var PresetDrawer = countlyVue.components.create({
        template: CV.T('/core/date-presets/templates/preset-drawer.html'),
        mixins: [
            countlyVue.mixins.i18n
        ],
        props: {
            controls: {
                type: Object
            }
        },
        data: function() {
            return {
                title: "",
                saveButtonLabel: "",
                sharingAllowed: countlyGlobal.sharing_status || AUTHENTIC_GLOBAL_ADMIN,
                groupSharingAllowed: countlyGlobal.plugins.indexOf("groups") > -1 && AUTHENTIC_GLOBAL_ADMIN,
                sharingOptions: sharingOptions,
                sharedEmailEdit: [],
                sharedEmailView: [],
                sharedGroupEdit: [],
                sharedGroupView: [],
                allGroups: [],
            };
        },
        computed: {
            canShare: function() {
                var canShare = this.sharingAllowed && (this.controls.initialEditedObject.is_owner || AUTHENTIC_GLOBAL_ADMIN);
                return canShare;
            },
            elSelectKey: function() {
                var key = this.allGroups.map(function(g) {
                    return g._id;
                }).join(",");

                return key;
            },
            period: {
                get: function() {
                    return {period: this.$refs.drawerScope.editedObject.range, exclude_current_day: this.$refs.drawerScope.editedObject.exclude_current_day};
                },
                set: function(value) {
                    this.$refs.drawerScope.editedObject.range = value;
                }
            }
        },
        created: function() {
            if (this.groupSharingAllowed) {
                var self = this;
                groupsModel.initialize().then(function() {
                    var groups = _.sortBy(groupsModel.data(), 'name');

                    var userGroups = groups.map(function(g) {
                        return {
                            name: g.name,
                            value: g._id
                        };
                    });

                    self.allGroups = userGroups;
                });
            }
        },
        methods: {
            onSubmit: function(doc) {
                var self = this;
                var action = "countlyPresets/create";
                var __action = doc.__action;

                if (__action === "edit") {
                    action = "countlyPresets/update";
                }

                var empty = countlyPresets.factory.getEmpty();
                var obj = {};

                var deleteShares = false;

                if (this.sharingAllowed) {
                    if (this.canShare) {
                        if (doc.share_with === "selected-users") {
                            doc.shared_email_edit = this.sharedEmailEdit;
                            doc.shared_email_view = this.sharedEmailView;

                            if (this.groupSharingAllowed) {
                                doc.shared_user_groups_edit = this.sharedGroupEdit;
                                doc.shared_user_groups_view = this.sharedGroupView;
                            }
                            else {
                                delete doc.shared_user_groups_edit;
                                delete doc.shared_user_groups_view;
                            }
                        }
                        else {
                            deleteShares = true;
                        }
                    }
                    else {
                        if (__action === "create" || __action === "duplicate") {
                            doc.share_with = "none";
                        }
                        deleteShares = true;
                    }
                }
                else {
                    if (__action === "create" || __action === "duplicate") {
                        doc.share_with = "none";
                    }
                    deleteShares = true;
                }

                if (deleteShares) {
                    delete doc.shared_email_edit;
                    delete doc.shared_email_view;
                    delete doc.shared_user_groups_edit;
                    delete doc.shared_user_groups_view;
                }

                for (var key in empty) {
                    if (Object.prototype.hasOwnProperty.call(doc, key)) {
                        obj[key] = doc[key];
                    }
                }

                delete obj.is_owner;

                this.$store.dispatch(action, obj).then(function(id) {
                    if (id) {
                        if (__action === "duplicate" || __action === "create") {
                            CountlyHelpers.notify({
                                message: CV.i18n('management.preset.created'),
                                type: "success"
                            });
                        }

                        if (__action === "edit") {
                            CountlyHelpers.notify({
                                message: CV.i18n('management.preset.updated'),
                                type: "success"
                            });
                        }

                        self.$emit("refresh-presets", true);
                    }
                });
            },
            onCopy: function(doc) {
                this.title = CV.i18n("management.preset.create-new-preset");
                this.saveButtonLabel = CV.i18n("common.create");

                if (doc.__action === "edit") {
                    this.title = CV.i18n("management.preset.edit-preset");
                    this.saveButtonLabel = CV.i18n("common.edit");
                }

                if (doc.__action === "duplicate") {
                    this.title = CV.i18n("management.preset.duplicate-preset");
                    this.saveButtonLabel = CV.i18n("common.duplicate");
                }

                this.sharedEmailEdit = doc.shared_email_edit || [];
                this.sharedEmailView = doc.shared_email_view || [];
                this.sharedGroupEdit = doc.shared_user_groups_edit || [];
                this.sharedGroupView = doc.shared_user_groups_view || [];

                if (!this.sharingAllowed) {
                    if (doc.__action === "create" ||
                        doc.__action === "duplicate") {
                        doc.share_with = "none";
                    }
                }
                this.$emit("open-drawer");
            },
            onClose: function() {
                this.$emit("close-drawer");
            },
            handleLabelChanged: function(payload) {
                this.$refs.drawerScope.editedObject.name = payload.label;
            },
            showExcludeCurrentDay: function(range) {
                return !Array.isArray(range);
            }
        }
    });

    var PresetManagement = countlyVue.views.create({
        template: CV.T('/core/date-presets/templates/preset-management.html'),
        mixins: [
            countlyVue.mixins.hasDrawers("preset")
        ],
        components: {
            "preset-drawer": PresetDrawer
        },
        data: function() {
            return {
                sharingOptions: sharingOptions
            };
        },
        computed: {
            rows: function() {
                return this.$store.getters["countlyPresets/presets"] || [];
            },
            isLoading: function() {
                return this.$store.getters["countlyPresets/isLoading"];
            }
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyPresets/getAll");
            },
            createNewPreset: function() {
                let emptyPreset = countlyPresets.factory.getEmpty();
                emptyPreset.__action = "create";
                this.openDrawer("preset", emptyPreset);
            },
            toggleFav: function(scope, row) {
                var self = this;
                row.fav = !row.fav;
                if (row.fav) {
                    row.sort_order = 0;
                }
                this.$store.dispatch("countlyPresets/update", row).then(function() {
                    self.refresh();
                });
            },
            handleCommand: function(command, presetObj) {
                var preset_id = presetObj._id;
                var self = this;
                if (command === "delete") {
                    CountlyHelpers.confirm(
                        CV.i18n("management.preset.delete-preset-confirm", presetObj.name || CV.i18n("management.preset.delete-preset-confirm-generic")),
                        "red",
                        function(result) {
                            if (!result) {
                                return;
                            }
                            self.$store.dispatch("countlyPresets/delete", preset_id).then(function() {
                                self.refresh();
                            });
                        },
                        [CV.i18n("common.cancel"), CV.i18n("common.delete")],
                        {title: CV.i18n("management.preset.delete-preset"), showClose: false, alignCenter: true}
                    );
                }
                else if (command === "edit") {
                    this.$store.dispatch("countlyPresets/getById", preset_id).then(function(preset) {
                        preset.__action = "edit";
                        self.openDrawer("preset", preset);
                    });
                }
                else if (command === "duplicate") {
                    this.$store.dispatch("countlyPresets/getById", preset_id).then(function(preset) {
                        preset.__action = "duplicate";
                        self.openDrawer("preset", preset);
                    });
                }
            },
            sharingOption: function(preset) {
                var option = this.sharingOptions.find(function(opt) {
                    return opt.value === preset.share_with;
                });

                return option ? option.name : "";
            },
            hasWritePermissions: function(preset) {
                return preset.is_owner || AUTHENTIC_GLOBAL_ADMIN || (preset.shared_email_edit && preset.shared_email_edit.length > 0) || (preset.shared_user_groups_edit && preset.shared_user_groups_edit.length > 0);
            },
            reorderPresets: function({oldIndex, newIndex}) {
                var self = this;
                var preset = this.rows[oldIndex];
                preset.sort_order = newIndex;
                this.$store.dispatch("countlyPresets/update", preset).then(function() {
                    self.refresh();
                });
            },
            onDragStart: function() {
                // We don't need to do anything here
            }
        },
        created: function() {
            this.refresh();
        }
    });

    Vue.component("date-presets-list", countlyVue.components.create({
        template: CV.T('/core/date-presets/templates/preset-list.html'),
        mixins: [
            countlyVue.mixins.i18n,
            countlyVue.mixins.hasDrawers("preset")
        ],
        props: {
            isGlobalDatePicker: {
                type: Boolean
            },
            allowCreate: {
                type: Boolean,
                default: true
            },
            localPresetId: {
                type: String
            }
        },
        components: {
            "preset-drawer": PresetDrawer
        },
        data: function() {
            return {
                scrollOps: {
                    vuescroll: {},
                    scrollPanel: {
                        initialScrollX: false,
                    },
                    rail: {
                        gutterOfSide: "1px",
                        gutterOfEnds: "15px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: false
                    }
                },
                selectedPresetId: null
            };
        },
        beforeCreate: function() {
            this.module = countlyPresets.getVuexModule();
            CV.vuex.registerGlobally(this.module);
        },
        created: function() {
            this.refresh();

            // If global datepicker, initialize selected preset to global preset
            if (this.isGlobalDatePicker) {
                this.selectedPresetId = this.globalPresetId;
            }

            // If previously selected preset, initialize selected preset to that
            if (this.localPresetId) {
                this.selectedPresetId = this.localPresetId;
            }
        },
        methods: {
            refresh: function() {
                this.$store.dispatch("countlyPresets/getAll");
            },
            onChange: function({moved}) {
                if (moved) {
                    var self = this;
                    var preset = moved.element;
                    preset.sort_order = moved.newIndex;
                    this.$store.dispatch("countlyPresets/update", preset).then(function() {
                        self.refresh();
                    });

                }
            },
            toggleFav: function(preset) {
                var self = this;
                preset.fav = !preset.fav;
                if (preset.fav) {
                    preset.sort_order = 0;
                }
                this.$store.dispatch("countlyPresets/update", preset).then(function() {
                    self.refresh();
                });
            },
            createNewPreset: function() {
                let emptyPreset = countlyPresets.factory.getEmpty();
                emptyPreset.__action = "create";
                this.openDrawer("preset", emptyPreset);
            },
            navigateToManagement: function() {
                app.navigate("/manage/date-presets", true);
            },
            onOpenDrawer: function() {
                let dropdown = document.getElementById("cly-datepicker");
                if (dropdown) {
                    dropdown.style.visibility = "hidden";
                }
                let drawer = document.getElementById("preset-drawer");
                if (drawer) {
                    drawer.style.visibility = "visible";
                }
            },
            onCloseDrawer: function() {
                let dropdown = document.getElementById("cly-datepicker");
                if (dropdown) {
                    dropdown.style.visibility = "visible";
                }
                this.refresh();
            },
            onPresetClick: function(preset) {
                this.selectedPresetId = preset._id;

                if (this.isGlobalDatePicker) {
                    this.globalPresetId = this.selectedPresetId;
                }

                this.$emit("preset-selected", this.selectedPreset);
            }
        },
        computed: {
            presets: function() {
                return this.$store.getters["countlyPresets/presets"] || [];
            },
            globalPresetId: {
                get: function() {
                    return countlyPresets.getGlobalDatePresetId();
                },
                set: function(id) {
                    if (id) {
                        countlyPresets.setGlobalDatePresetId(id);
                    }
                    else {
                        countlyPresets.clearGlobalDatePresetId();
                    }
                }
            },
            isLoading: function() {
                return this.$store.getters["countlyPresets/isLoading"];
            },
            selectedPreset: function() {
                var self = this;
                return this.presets.find(function(p) {
                    return p._id === self.selectedPresetId;
                });
            }
        }
    }));

    //ROUTING

    var getManagementView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: PresetManagement,
            vuex: [{clyModel: countlyPresets}]
        });
    };

    if (countlyAuth.validateCreate('core')) {
        app.route("/manage/date-presets", "date-presets", function() {
            const PresetManagementView = getManagementView();
            this.renderWhenReady(PresetManagementView);
        });

        app.addMenu("management", {code: "presets", permission: "core", url: "#/manage/date-presets", text: "sidebar.management.presets", priority: 30});
    }

})();