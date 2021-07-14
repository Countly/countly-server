/*global countlyAuth, app, countlyGlobal, setTimeout, setInterval, clearInterval, CV, countlyVue, countlyUserManagement, countlyCommon, CountlyHelpers */
(function() {
    var FEATURE_NAME = "global_users";

    var DataTable = countlyVue.views.create({
        template: CV.T("/core/user-management/templates/data-table.html"),
        mixins: [countlyVue.mixins.commonFormatters],
        props: {
            rows: Array
        },
        data: function() {
            return {};
        },
        created: function() {
        },
        methods: {
            handleCommand: function(command, index) {
                var self = this;
                switch (command) {
                case "delete-user":
                    self.$confirm('This will permanently delete the user. Continue?', 'Warning', {
                        confirmButtonText: 'OK',
                        cancelButtonText: 'Cancel',
                        type: 'warning'
                    })
                        .then(function() {
                            countlyUserManagement.deleteUser(index, function() {
                                self.$message({
                                    message: 'User deleted successfully.',
                                    type: 'success'
                                });
                            });
                        })
                        .catch(function() {
                            self.$message({
                                type: 'info',
                                message: 'Delete canceled'
                            });
                        });
                    break;
                case 'edit-user':
                    this.$emit('edit-user', index);
                    break;
                }
            }
        }
    });

    var Drawer = countlyVue.views.create({
        template: CV.T("/core/user-management/templates/drawer.html"),
        props: {
            settings: Object,
            controls: Object,
            features: {
                type: Array,
                default: []
            },
            editMode: {
                type: Boolean,
                default: false
            },
            user: {
                type: Object,
                default: {}
            }
        },
        data: function() {
            return {
                // TODO: remove Object.values usage
                apps: Object.values(countlyGlobal.apps).map(function(a) {
                    return { value: a._id, label: a.name };
                }),
                permissionSets: [],
                adminAppSelector: '',
                dropzoneOptions: {
                    member: null,
                    url: "/member/icon",
                    autoProcessQueue: false,
                    acceptedFiles: 'image/*',
                    maxFiles: 1,
                    thumbnailWidth: 100,
                    thumbnailHeight: 100,
                    addRemoveLinks: true,
                    dictRemoveFile: 'Remove image',
                    previewTemplate: this.template(),
                    paramName: "member_image",
                    params: { _csrf: countlyGlobal.csrf_token }
                },
                uploadCompleted: false,
                fileAdded: false
            };
        },
        methods: {
            // cly-dropzone handlers
            template: function() {
                var template = '<div class="dz-preview dz-file-preview">';
                template += '<div class="dz-image">';
                template += '<div data-dz-thumbnail-bg></div>';
                template += '</div>';
                template += '<div class="user-management-drawer-content__profile-picture-area__upload-section__description-box">';
                template += '<p class="user-management-drawer-content__profile-picture-area__upload-section__description-box--bold">Drag and drop or <span class="user-management-drawer-content__profile-picture-area__upload-section__description-box--link">browser</span> files <br> to add picture</p>';
                template += '<p class="user-management-drawer-content__profile-picture-area__upload-section__size-warning">JPG, PNG and GIF files allowed. Maximum size is 5 MB.</p>';
                template += '</div>';
                template += '</div>';
                return template;
            },
            thumbnail: function(file, dataUrl) {
                var j, len, ref, thumbnailElement;
                if (file.previewElement) {
                    file.previewElement.classList.remove("dz-file-preview");
                    ref = file.previewElement.querySelectorAll("[data-dz-thumbnail-bg]");
                    for (j = 0, len = ref.length; j < len; j++) {
                        thumbnailElement = ref[j];
                        thumbnailElement.alt = file.name;
                        thumbnailElement.style.backgroundImage = 'url("' + dataUrl + '")';
                    }
                    return setTimeout(((function() {
                        return function() {
                            return file.previewElement.classList.add("dz-image-preview");
                        };
                    })(this)), 1);
                }
            },
            onFileAdded: function() {
                this.fileAdded = true;
            },
            onFileRemoved: function() {
                this.fileAdded = false;
            },
            onSending: function(file, xhr, formData) {
                formData.append('member_image_id', this.dropzoneOptions.member._id);
            },
            onComplete: function() {
                this.uploadCompleted = true;
            },
            // permission sets handlers
            onAdminAppsChanged: function() {
                var adminApps = this.$refs.userDrawer.editedObject.permission._.a;
                var userApps = this.$refs.userDrawer.editedObject.permission._.u;
                var conflictIndex = -1;
                var conflictSetIndex = -1;

                // check conflicts
                for (var i0 = 0; i0 < adminApps.length; i0++) {
                    for (var j0 = 0; j0 < userApps.length; j0++) {
                        for (var k0 = 0; k0 < userApps[j0].length; k0++) {
                            if (adminApps[i0] === userApps[j0][k0]) {
                                conflictIndex = k0;
                                conflictSetIndex = j0;
                            }
                        }
                    }
                }

                if (conflictSetIndex !== -1) {
                    this.$set(this.$refs.userDrawer.editedObject.permission, this.$refs.userDrawer.editedObject.permission._.u[conflictSetIndex].splice(conflictIndex, 1));
                }
            },
            onUserAppsChanged: function(index) {
                var userApps = this.$refs.userDrawer.editedObject.permission._.u;
                var appsInThisSet = userApps[index];
                var adminApps = this.$refs.userDrawer.editedObject.permission._.a;
                var conflictIndex = -1;
                var conflictSetIndex = -1;
                var adminConflictIndex = -1;

                // check conflict with admin apps
                for (var i = 0; i < appsInThisSet.length; i++) {
                    for (var j = 0; j < adminApps.length; j++) {
                        if (appsInThisSet[i] === adminApps[j]) {
                            adminConflictIndex = j;
                        }
                    }
                }

                if (adminConflictIndex === -1) {
                    // check conflict with user apps
                    for (var i0 = 0; i0 < appsInThisSet.length; i0++) {
                        for (var j0 = 0; j0 < userApps.length; j0++) {
                            for (var k0 = 0; k0 < userApps[j0].length; k0++) {
                                if (j0 === index) {
                                    continue;
                                }
                                if (appsInThisSet[i0] === userApps[j0][k0]) {
                                    conflictIndex = k0;
                                    conflictSetIndex = j0;
                                }
                            }
                        }
                    }
                }

                if (adminConflictIndex !== -1) {
                    this.$set(this.$refs.userDrawer.editedObject.permission._.a, this.$refs.userDrawer.editedObject.permission._.a.splice(adminConflictIndex, 1));
                }
                else if (conflictIndex !== -1) {
                    this.$set(this.$refs.userDrawer.editedObject.permission._.u, this.$refs.userDrawer.editedObject.permission._.u[conflictSetIndex].splice(conflictIndex, 1));
                }
            },
            addPermissionSet: function() {
                var permissionSet = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};
                var types = ['c', 'r', 'u', 'd'];

                for (var type in types) {
                    for (var feature in this.features) {
                        permissionSet[types[type]].allowed[this.features[feature]] = false;
                    }
                }

                this.permissionSets.push(permissionSet);
            },
            removePermissionSet: function(index) {
                this.permissionSets.splice(index, 1);
                this.$set(this.$refs.userDrawer.editedObject.permission._.u, this.$refs.userDrawer.editedObject.permission._.u.splice(index, 1));
            },
            setPermissionByFeature: function(index, type, feature) {
                if (!this.permissionSets[index][type].allowed[feature] && this.permissionSets[index][type].all) {
                    this.permissionSets[index][type].all = false;
                }
            },
            setPermissionByType: function(index, type) {
                for (var feature in this.features) {
                    this.permissionSets[index][type].allowed[this.features[feature]] = this.permissionSets[index][type].all;
                }
            },
            handleCommand: function(command, index) {
                switch (command) {
                case "remove-set":
                    this.removePermissionSet(index);
                    break;
                }
            },
            // drawer event handlers
            onClose: function() {},
            onSubmit: function(submitted, done) {
                var self = this;
                if (this.settings.editMode) {
                    submitted.permission = countlyAuth.combinePermissionObject(submitted.permission._.u, this.permissionSets, submitted.permission);
                    countlyUserManagement.editUser(this.user._id, submitted, function() {
                        self.dropzoneOptions.member = { _id: self.user._id };
                        self.$refs.userDrawerDropzone.processQueue();
                        var checkUploadProcess = setInterval(function() {
                            if (self.uploadCompleted) {
                                // show success message
                                self.$message({
                                    message: 'User updated successfully.',
                                    type: 'success'
                                });
                                clearCheck();
                                done();
                            }
                        }, 1000);

                        var clearCheck = function() {
                            clearInterval(checkUploadProcess);
                        };
                    // TODO: show toast
                    });
                }
                else {
                    submitted.permission = countlyAuth.combinePermissionObject(submitted.permission._.u, this.permissionSets, submitted.permission);
                    submitted.password = CountlyHelpers.generatePassword(countlyGlobal.security.password_min);
                    countlyUserManagement.createUser(submitted, function(res) {
                        self.dropzoneOptions.member = { _id: res._id };
                        self.$refs.userDrawerDropzone.processQueue();
                        var checkUploadProcess = setInterval(function() {
                            if (self.uploadCompleted) {
                                self.$message({
                                    message: 'User created successfully.',
                                    type: 'success'
                                });
                                clearCheck();
                                done();
                            }
                        }, 1000);

                        var clearCheck = function() {
                            clearInterval(checkUploadProcess);
                        };
                    });
                }
            },
            onOpen: function() {
                // types
                var types = ['c', 'r', 'u', 'd'];

                // clear permission sets
                this.permissionSets = [];

                // if it's in edit mode
                if (this.settings.editMode) {
                    var userAppsSets = this.user.permission._.u;

                    if (!this.user.global_admin) {
                        for (var set in userAppsSets) {
                            var appFromSet = userAppsSets[set][0];
                            var permissionSet = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};
                            for (var type in types) {
                                for (var feature in this.features) {
                                    permissionSet[types[type]].all = this.user.permission[types[type]][appFromSet].all;
                                    permissionSet[types[type]].allowed[this.features[feature]] = this.user.permission[types[type]][appFromSet].allowed[this.features[feature]];
                                }
                            }
                            this.permissionSets.push(permissionSet);
                        }
                    }
                    else {
                        this.permissionSets.push({ c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});
                    }
                }
                // initialize default permission sets for create mode
                else {
                    if (this.features.length === 0) {
                        return;
                    }

                    var permissionSet_ = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};

                    for (var type_ in types) {
                        for (var feature_ in this.features) {
                            permissionSet_[types[type_]].allowed[this.features[feature_]] = false;
                        }
                    }

                    this.permissionSets.push(permissionSet_);
                }
            },
            // TODO: move this to countlyAuth
            featureBeautifier: function(featureName) {
                var fa = featureName.split('_');
                var ret = '';
                for (var i = 0; i < fa.length; i++) {
                    ret += fa[i].substr(0, 1).toUpperCase() + fa[i].substr(1, fa[i].length - 1) + ' ';
                }
                return ret;
            }
        }
    });

    // create vue view
    var ManageUsersContainer = countlyVue.views.create({
        template: CV.T("/core/user-management/templates/user-management.html"),
        components: {
            'data-table': DataTable,
            'drawer': Drawer
        },
        mixins: [countlyVue.mixins.hasDrawers("user")],
        data: function() {
            return {
                users: [],
                user: {},
                currentTab: 'users',
                appId: countlyCommon.ACTIVE_APP_ID,
                drawerSettings: {
                    createTitle: 'Create new user',
                    editTitle: 'Edit user',
                    saveButtonLabel: 'Save User',
                    createButtonLabel: 'Create User',
                    editMode: false
                },
                features: []
            };
        },
        methods: {
            refresh: function() {
                var self = this;
                countlyUserManagement.fetchUsers()
                    .then(function() {
                        // TODO: remove Object.values usage
                        self.users = Object.values(countlyUserManagement.getUsers());
                    })
                    .catch(function() {});
            },
            createUser: function() {
                this.drawerSettings.editMode = false;
                this.openDrawer("user", countlyUserManagement.getEmptyUser());
            },
            onEditUser: function(id) {
                var self = this;
                countlyUserManagement.fetchUserDetail(id)
                    .then(function() {
                        self.drawerSettings.editMode = true;
                        self.user = countlyUserManagement.getUser();
                        self.openDrawer("user", countlyUserManagement.getUser());
                    });
            }
        },
        beforeCreate: function() {
            var self = this;
            countlyUserManagement.fetchUsers()
                .then(function() {
                    // TODO: remove object.values usage
                    self.users = Object.values(countlyUserManagement.getUsers());
                })
                .catch(function() {});
            countlyUserManagement.fetchFeatures()
                .then(function() {
                    self.features = countlyUserManagement.getFeatures();
                })
                .catch(function() {});
        }
    });

    // wrap vue object with backbone wrapper
    var ManageUsersView = new countlyVue.views.BackboneWrapper({
        component: ManageUsersContainer
    });

    app.ManageUsersView = ManageUsersView;

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route("/manage/users", "manage-users", function() {
            this.renderWhenReady(this.ManageUsersView);
        });

        app.route("/manage/users/:tab", "manage-users-tab", function() {
            // inject current tab state to vue state
            this.renderWhenReady(this.ManageUsersView);
        });
    }
})();