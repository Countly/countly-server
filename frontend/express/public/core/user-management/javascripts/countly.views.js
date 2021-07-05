/*global countlyAuth, app, countlyGlobal, CV, countlyVue, countlyUserManagement, countlyCommon, CountlyHelpers */
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
                switch (command) {
                case "delete-user":
                    // TODO: wrap it with popup
                    countlyUserManagement.deleteUser(index, function() {
                        // TODO: show toast
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
        props: ['settings', 'controls', 'features'],
        data: function() {
            return {
                apps: Object.values(countlyGlobal.apps).map(function(a) {
                    return { value: a._id, label: a.name };
                }),
                permissionSets: [],
                adminAppSelector: ''
            };
        },
        watch: {
            // insert first permission set when features set for first time
            features: function(features) {
                if (this.permissionSets.length > 0) {
                    return;
                }
                var permissionSet = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};
                var types = ['c', 'r', 'u', 'd'];

                for (var type in types) {
                    for (var feature in features) {
                        permissionSet[types[type]].allowed[features[feature]] = false;
                    }
                }

                this.permissionSets.push(permissionSet);
            }
        },
        methods: {
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
            },
            onClose: function() {},
            onSubmit: function(submitted) {
                submitted.permission = countlyAuth.combinePermissionObject(submitted.permission._.u, this.permissionSets, submitted.permission);
                submitted.password = CountlyHelpers.generatePassword(countlyGlobal.security.password_min);
                countlyUserManagement.createUser(submitted, function() {
                // TODO: show toast
                });
            },
            featureBeautifier: function(featureName) {
                var fa = featureName.split('_');
                var ret = '';
                for (var i = 0; i < fa.length; i++) {
                    ret += fa[i].substr(0, 1).toUpperCase() + fa[i].substr(1, fa[i].length - 1) + ' ';
                }
                return ret;
            },
            handleCommand: function(command, index) {
                switch (command) {
                case "remove-set":
                    this.removePermissionSet(index);
                    break;
                }
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
            }
        },
        created: function() {
            this.permissionSets = [];
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
                currentTab: 'users',
                appId: countlyCommon.ACTIVE_APP_ID,
                drawerSettings: {
                    title: 'Create new user',
                    saveButtonLabel: 'Create User',
                    hasCancelButton: true,
                    cancelButtonLabel: 'Cancel'
                },
                features: []
            };
        },
        methods: {
            refresh: function() {
                var self = this;
                countlyUserManagement.fetchUsers()
                    .then(function() {
                        self.users = Object.values(countlyUserManagement.getUsers());
                    })
                    .catch(function() {
                        // TODO: Handle error
                    });
            },
            createUser: function() {
                this.openDrawer("user", countlyUserManagement.getEmptyUser());
            },
            onEditUser: function(id) {
                var self = this;
                countlyUserManagement.fetchUserDetail(id)
                    .then(function() {
                        self.openDrawer("user", countlyUserManagement.getUser());
                    });
            }
        },
        beforeCreate: function() {
            var self = this;
            countlyUserManagement.fetchUsers()
                .then(function() {
                    self.users = Object.values(countlyUserManagement.getUsers());
                })
                .catch(function() {
                    // TODO: Handle error
                });
            countlyUserManagement.fetchFeatures()
                .then(function() {
                    self.features = countlyUserManagement.getFeatures();
                })
                .catch(function() {
                    // TODO: Handle error
                });
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