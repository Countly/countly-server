/*global countlyAuth, app, countlyGlobal, $, groupsModel, CV, countlyVue, countlyUserManagement, countlyCommon, CountlyHelpers */
(function() {
    var isGroupPluginEnabled = countlyGlobal.plugins.includes("groups");

    var DataTable = countlyVue.views.create({
        template: CV.T("/core/user-management/templates/data-table.html"),
        mixins: [countlyVue.mixins.commonFormatters],
        props: {
            rows: Array,
            loading: Boolean,
            groupMap: Object
        },
        data: function() {
            var roleMap = {};
            // 'value' is used as map key here to make it easier to convert currentFilter into filterSummary
            roleMap.global_admin = CV.i18n("management-users.global-admin");
            roleMap.admin = CV.i18n("management-users.admin");
            roleMap.user = CV.i18n("management-users.user");
            var tableDynamicCols = [
                {
                    value: "full_name",
                    label: CV.i18n('management-users.user'),
                    default: true
                },
                {
                    value: "username",
                    label: CV.i18n('management-users.username'),
                    default: false
                },
                {
                    value: "role",
                    label: CV.i18n('management-users.role'),
                    default: true
                },
                {
                    value: "email",
                    label: CV.i18n('management-users.email'),
                    default: true
                },
                {
                    value: "group",
                    label: CV.i18n('management-users.group'),
                    default: true
                },
                {
                    value: "created_at",
                    label: CV.i18n('management-users.created'),
                    default: false
                },
                {
                    value: "last_login",
                    label: CV.i18n('management-users.last_login'),
                    default: true
                }
            ];

            if (!isGroupPluginEnabled) {
                tableDynamicCols.splice(4, 1);
            }

            return {
                currentFilter: {
                    role: null,
                    group: null
                },
                roleMap: roleMap,
                showLogs: countlyGlobal.plugins.indexOf('systemlogs') > -1,
                tableDynamicCols: tableDynamicCols,
                userManagementPersistKey: 'userManagement_table_' + countlyCommon.ACTIVE_APP_ID,
                isGroupPluginEnabled: isGroupPluginEnabled
            };
        },
        computed: {
            filteredRows: function() {
                if (this.currentFilter.group || this.currentFilter.role) {
                    var currentGroup = this.currentFilter.group;
                    var currentRole = this.currentFilter.role;

                    return this.rows.filter(function(row) {
                        var filterGroup = true;
                        var filterRole = true;

                        if (currentGroup) {
                            filterGroup = row.group_id && (row.group_id[0] === currentGroup);
                        }

                        if (currentRole === "global_admin") {
                            filterRole = row.global_admin;
                        }
                        else if (currentRole === "admin") {
                            filterRole = !row.global_admin && (row.permission && row.permission._.a.length > 0);
                        }
                        else if (currentRole === "user") {
                            filterRole = !row.global_admin && (row.permission && row.permission._.a.length === 0);
                        }

                        return filterGroup && filterRole;
                    });
                }
                else {
                    return this.rows;
                }
            },
            filterSummary: function() {
                var summary = [
                    this.roleMap[this.currentFilter.role] || CV.i18n("management-users.all-roles")
                ];

                if (isGroupPluginEnabled) {
                    summary.push(this.groupMap[this.currentFilter.group] || CV.i18n("management-users.all-groups"));
                }

                return summary.join(", ");
            }
        },
        methods: {
            handleCommand: function(command, index) {
                switch (command) {
                case "delete-user":
                    var self = this;
                    CountlyHelpers.confirm(CV.i18n('management-users.this-will-delete-user'), "red", function(result) {
                        if (!result) {
                            CountlyHelpers.notify({
                                type: 'info',
                                message: CV.i18n('management-users.remove-canceled')
                            });
                            return true;
                        }

                        countlyUserManagement.deleteUser(index, function() {
                            CountlyHelpers.notify({
                                message: CV.i18n('management-users.removed-message'),
                                type: 'success'
                            });
                            self.$emit('refresh-table');
                        });
                    }, [], { image: 'delete-user', title: CV.i18n('management-users.warning') });
                    break;
                case 'edit-user':
                    this.$emit('edit-user', index);
                    break;
                case 'show-logs':
                    window.location.hash = "#/manage/logs/systemlogs/query/" + JSON.stringify({"user_id": index});
                    break;
                }
            },
            handleSubmitFilter: function(newFilter) {
                this.currentFilter = newFilter;
                this.$refs.filterDropdown.doClose();
            },
            handleCancelFilterClick: function() {
                this.$refs.filterDropdown.doClose();
                this.reloadFilterValues();
            },
            handleResetFilterClick: function() {
                this.currentFilter = {
                    group: null,
                    role: null
                };
                this.$refs.filterDropdown.doClose();
            },
            reloadFilterValues: function() {
                this.$refs.filterForm.reload();
            },
            formatExportFunction: function() {
                var tableData = this.filteredRows;
                var table = [];
                for (var i = 0; i < tableData.length; i++) {
                    var item = {};
                    item[CV.i18n('management-users.user').toUpperCase()] = tableData[i].full_name;
                    item[CV.i18n('management-users.username').toUpperCase()] = tableData[i].username;
                    item[CV.i18n('management-users.role').toUpperCase()] = tableData[i].global_admin ? CV.i18n('management-users.global-admin') : ((tableData[i].permission && tableData[i].permission._ && tableData[i].permission._.a.length > 0) ? CV.i18n('management-users.admin') : CV.i18n('management-users.user'));
                    item[CV.i18n('management-users.email').toUpperCase()] = tableData[i].email;
                    item[CV.i18n('management-users.group').toUpperCase()] = tableData[i].groupNames ? tableData[i].groupNames : '';
                    item[CV.i18n('management-users.created').toUpperCase()] = countlyCommon.formatTimeAgoText(tableData[i].created_at).text;
                    item[CV.i18n('management-users.last_login').toUpperCase()] = tableData[i].last_login === 0 ? CV.i18n('management-users.not-logged-in-yet') : countlyCommon.formatTimeAgoText(tableData[i].last_login).text;

                    table.push(item);
                }
                return table;

            },
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
        mixins: [
            // call groups plugin input mixin for drawer
            countlyVue.container.dataMixin({"groupsInput": "groups/input", "rolesInput": "user/roles"}),
        ],
        data: function() {
            var comboPermissionSets = {
                "data_manager: Transformations": {
                    c: {
                        "data_manager": ['r', 'u'],
                    },
                    r: {
                        "data_manager": ['r']
                    },
                }
            };
            //read permission check in set
            for (var feature in comboPermissionSets) {
                var perms = Object.keys(comboPermissionSets[feature]);
                for (perm of perms) {
                    var permFeatures = Object.keys(comboPermissionSets[feature][perm]);
                    for (permFeature of permFeatures) {
                        var targetAr = comboPermissionSets[feature][perm][permFeature];
                        if (targetAr.length && targetAr.indexOf('r') === -1) {
                            comboPermissionSets[feature][perm][permFeature].push('r');
                        }
                    }
                }
            }

            var inverseComboPermissionSets = {};
            for (var feature in comboPermissionSets) {
                var perms = Object.keys(comboPermissionSets[feature]);
                for (perm of perms) {
                    var permFeatures = Object.keys(comboPermissionSets[feature][perm]);
                    for (permFeature of permFeatures) {
                        if (!inverseComboPermissionSets[permFeature]) {
                            inverseComboPermissionSets[permFeature] = {c: {}, r: {}, u: {}, d: {}};
                        }
                        comboPermissionSets[feature][perm][permFeature].forEach(function(localPerm) {
                            if (!inverseComboPermissionSets[permFeature][localPerm][feature]) {
                                inverseComboPermissionSets[permFeature][localPerm][feature] = true;
                            }
                        });
                    }
                }
            }

            return {
                comboPermissionSets,
                inverseComboPermissionSets,
                pictureEditMode: false,
                changePasswordFlag: false,
                apps: [],
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
                    dictRemoveFile: CV.i18n('management-users.remove-image'),
                    previewTemplate: this.template(),
                    paramName: "member_image",
                    params: { _csrf: countlyGlobal.csrf_token }
                },
                uploadCompleted: false,
                fileAdded: false,
                groups: [],
                roles: {}
            };
        },
        methods: {
            featureBeautifier: countlyAuth.featureBeautifier,
            generatePassword: function() {
                var generatedPassword = CountlyHelpers.generatePassword(countlyGlobal.security.password_min);
                this.$refs.userDrawer.editedObject.password = generatedPassword;
            },
            // cly-dropzone handlers
            template: function() {
                var template = '<div class="dz-preview dz-file-preview">';
                template += '<div class="dz-image">';
                template += '<div data-dz-thumbnail-bg></div>';
                template += '</div>';
                template += '<div class="user-management-drawer-content__profile-picture-area__upload-section__description-box">';
                template += '<p class="user-management-drawer-content__profile-picture-area__upload-section__description-box--bold">' + CV.i18n('management-users.drag-and-drop-or') + '<span class="user-management-drawer-content__profile-picture-area__upload-section__description-box--link">' + CV.i18n('management-users.browser') + '</span>' + CV.i18n('management-users.files-to-add-picture') + '</p>';
                template += '<p class="user-management-drawer-content__profile-picture-area__upload-section__size-warning">' + CV.i18n('management-users.pp-size-warning') + '</p>';
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
                    var conflictedAppId = this.$refs.userDrawer.editedObject.permission._.u[conflictSetIndex][conflictIndex];
                    var types = ["c", "r", "u", "d"];
                    for (var index in types) {
                        delete this.$refs.userDrawer.editedObject.permission[types[index]][conflictedAppId];
                    }
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
                var types = ["c", "r", "u", "d"];

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

                for (var app in countlyGlobal.apps) {
                    var appId = countlyGlobal.apps[app]._id;
                    if (userApps.indexOf(appId) === -1 && adminApps.indexOf(appId)) {
                        for (var typeIndex in types) {
                            delete this.$refs.userDrawer.editedObject.permission[types[typeIndex]][appId];
                        }
                    }
                }
            },
            addPermissionSet: function() {
                var permissionSet = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};
                var types = ['c', 'r', 'u', 'd'];

                for (var type in types) {
                    for (var feature in this.features) {
                        if (!(types[type] === 'r' && this.features[feature] === 'core')) {
                            permissionSet[types[type]].allowed[this.features[feature]] = false;
                        }
                    }
                }

                this.permissionSets.push(permissionSet);
            },
            removePermissionSet: function(index) {
                if (this.$refs.userDrawer.editedObject.permission._.u[index]) {
                    for (var i = 0; i < this.$refs.userDrawer.editedObject.permission._.u[index].length; i++) {
                        var app_id = this.$refs.userDrawer.editedObject.permission._.u[index][i];
                        this.$refs.userDrawer.editedObject.permission.c[app_id] = undefined;
                        this.$refs.userDrawer.editedObject.permission.r[app_id] = undefined;
                        this.$refs.userDrawer.editedObject.permission.u[app_id] = undefined;
                        this.$refs.userDrawer.editedObject.permission.d[app_id] = undefined;
                    }
                }
                this.permissionSets.splice(index, 1);
                this.$set(this.$refs.userDrawer.editedObject.permission._.u, this.$refs.userDrawer.editedObject.permission._.u.splice(index, 1));
            },
            setPermissionByFeature: function(index, type, feature) {
                var types = ['c', 'r', 'u', 'd'];
                var self = this;
                if (type !== 'r' && !(this.permissionSets[index].r.all || this.permissionSets[index].r.allowed[feature])) {
                    this.permissionSets[index].r.allowed[feature] = true;
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.read-permission-given-feature') + ' ' + this.featureBeautifier(feature),
                        type: 'info'
                    });
                }
                if (type === 'r' && !this.permissionSets[index].r.allowed[feature]) {
                    for (var _type in types) {
                        this.permissionSets[index][types[_type]].allowed[feature] = false;
                        if (this.permissionSets[index][types[_type]].all) {
                            this.permissionSets[index][types[_type]].all = false;
                            for (var _feature in this.features) {
                                if (this.features[_feature] !== feature) {
                                    this.permissionSets[index][types[_type]].allowed[this.features[_feature]] = true;
                                }
                            }
                        }
                    }
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.other-permissions-for') + ' ' + this.featureBeautifier(feature) + ' ' + CV.i18n('management-users.removed-because-disabled'),
                        type: 'info'
                    });
                }
                if (!this.permissionSets[index][type].allowed[feature] && this.permissionSets[index][type].all) {
                    this.permissionSets[index][type].all = false;
                }

                if (this.permissionSets[index][type].allowed[feature] && this.comboPermissionSets[feature] && this.comboPermissionSets[feature][type]) {
                    if (type !== 'r' && this.comboPermissionSets[feature].r) {
                        Object.keys(this.comboPermissionSets[feature].r).forEach(function(preReqfeature) {
                            self.comboPermissionSets[feature].r[preReqfeature].forEach(function(preReqfeaturePerm) {
                                if (!self.permissionSets[index][preReqfeaturePerm].allowed[preReqfeature]) {
                                    self.permissionSets[index][preReqfeaturePerm].allowed[preReqfeature] = true;
                                    CountlyHelpers.notify({
                                        message: CV.i18n('management-users.read-permission-given-feature') + ' ' + self.featureBeautifier(preReqfeature),
                                        type: 'info'
                                    });
                                }
                            });
                        });
                    }
                    var preReqfeatures = this.comboPermissionSets[feature][type];
                    Object.keys(preReqfeatures).forEach(function(preReqfeature) {
                        preReqfeatures[preReqfeature].forEach(function(preReqfeaturePerm) {
                            if (!self.permissionSets[index][preReqfeaturePerm].allowed[preReqfeature]) {
                                self.permissionSets[index][preReqfeaturePerm].allowed[preReqfeature] = true;
                                CountlyHelpers.notify({
                                    message: CV.i18n('management-users.read-permission-given-feature') + ' ' + self.featureBeautifier(preReqfeature),
                                    type: 'info'
                                });
                            }
                        });
                    });
                }
                else if (!this.permissionSets[index][type].allowed[feature] && this.inverseComboPermissionSets[feature] && this.inverseComboPermissionSets[feature][type]) {
                    var inversePreReqfeatures = self.inverseComboPermissionSets[feature][type];
                    Object.keys(inversePreReqfeatures).forEach(function(inversePreReqfeature) {
                        if (self.comboPermissionSets[inversePreReqfeature]) {
                            Object.keys(self.comboPermissionSets[inversePreReqfeature]).forEach(function(typeKey) {
                                var preReqPerms = self.comboPermissionSets[inversePreReqfeature][typeKey][feature];
                                if (preReqPerms && preReqPerms.indexOf(type) !== -1) {
                                    if (self.permissionSets[index][typeKey].allowed[inversePreReqfeature]) {
                                        self.permissionSets[index][typeKey].allowed[inversePreReqfeature] = false;
                                        CountlyHelpers.notify({
                                            message: CV.i18n('management-users.other-permissions-for') + ' ' + this.featureBeautifier(inversePreReqfeature) + ' ' + CV.i18n('management-users.removed-because-disabled'),
                                            type: 'info'
                                        });
                                    }

                                }
                            });
                        }
                    });
                }

            },
            setPermissionByType: function(index, type) {
                var types = ['c', 'r', 'u', 'd'];
                // set true read permissions automatically if read not selected yet
                if (this.permissionSets[index][type].all && type !== 'r' && !this.permissionSets[index].r.all) {
                    this.permissionSets[index].r.all = true;
                    for (var feature in this.features) {
                        if (this.features[feature] !== 'core') {
                            this.permissionSets[index].r.allowed[this.features[feature]] = this.permissionSets[index][type].all;
                        }
                    }
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.read-permission-all'),
                        type: 'info'
                    });
                }
                // set false all other permissions automatically if read set as false
                if (type === 'r' && !this.permissionSets[index].r.all) {
                    for (var _type in types) {
                        this.permissionSets[index][types[_type]].all = false;
                        for (var feature1 in this.features) {
                            if (!(types[_type] === 'r' && this.features[feature1] === 'core')) {
                                this.permissionSets[index][types[_type]].allowed[this.features[feature1]] = false;
                            }
                        }
                    }
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.other-permissions-removed'),
                        type: 'info'
                    });
                }
                // set type specific features for other cases
                for (var feature2 in this.features) {
                    if (!(type === 'r' && this.features[feature2] === 'core')) {
                        this.permissionSets[index][type].allowed[this.features[feature2]] = this.permissionSets[index][type].all;
                    }
                }
                if (this.permissionSets[index][type].all) {
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.future-plugins'),
                        type: 'info'
                    });
                }
            },
            handleCommand: function(command, index) {
                switch (command) {
                case "remove-set":
                    this.removePermissionSet(index);
                    break;
                }
            },
            handlePPCommand: function(command) {
                switch (command) {
                case "edit-pp":
                    this.pictureEditMode = true;
                    break;
                }
            },
            addRolesToUserUnderEdit: function(userUnderEdit) {
                var self = this;
                Object.keys(this.roles).forEach(function(roleName) {
                    userUnderEdit[roleName] = self.roles[roleName].value;
                });
            },
            // drawer event handlers
            onClose: function() {},
            onSubmit: function(submitted, done) {
                var atLeastOneAppSelected = false;

                for (var i = 0; i < submitted.permission._.u.length; i++) {
                    if (submitted.permission._.u[i].length > 0) {
                        atLeastOneAppSelected = true;
                    }
                }

                // block process if no app selected
                // and user is not admin
                // and user is not assigned to any group
                if (!atLeastOneAppSelected && submitted.permission._.a.length === 0 && !submitted.global_admin && this.groups.length === 0) {
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.at-least-one-app-required'),
                        type: 'error'
                    });
                    done(CV.i18n('management-users.at-least-one-app-required'));
                    return;
                }

                var self = this;
                this.addRolesToUserUnderEdit(submitted);
                if (this.settings.editMode) {
                    if (this.groups.length === 0) {
                        submitted.permission = countlyAuth.combinePermissionObject(submitted.permission._.u, this.permissionSets, submitted.permission);
                    }
                    countlyUserManagement.editUser(this.user._id, submitted, function(res) {
                        if (res.result && typeof res.result === "string") {
                            if (self.groupsInput.length) {
                                var group_id = self.groups;
                                groupsModel.saveUserGroup({ email: submitted.email, group_id: group_id }, function() {});
                            }
                            self.$emit('refresh-table');
                            self.group = {};
                            if (self.$refs.userDrawerDropzone && self.$refs.userDrawerDropzone.getAcceptedFiles() && self.$refs.userDrawerDropzone.getAcceptedFiles().length > 0) {
                                self.dropzoneOptions.member = { _id: self.user._id };
                                self.$refs.userDrawerDropzone.processQueue();
                                var checkUploadProcess = setInterval(function() {
                                    if (self.uploadCompleted) {
                                        // show success message
                                        CountlyHelpers.notify({
                                            message: CV.i18n('management-users.updated-message'),
                                            type: 'success'
                                        });
                                        clearCheck();
                                        done();
                                    }
                                }, 1000);

                                var clearCheck = function() {
                                    clearInterval(checkUploadProcess);
                                };
                            }
                            else {
                                // show success message
                                CountlyHelpers.notify({
                                    message: CV.i18n('management-users.updated-message'),
                                    type: 'success'
                                });
                                done();
                            }
                        }
                        else if (typeof res === "object") {
                            for (var i2 = 0; i2 < res.length; i2++) {
                                CountlyHelpers.notify({
                                    message: res[i2],
                                    type: 'error'
                                });
                            }
                            self.$refs.userDrawer.isSubmitPending = false;
                        }
                        else {
                            CountlyHelpers.notify({
                                message: CV.i18n('management-applications.plugins.smth'),
                                type: 'error'
                            });
                            self.$refs.userDrawer.isSubmitPending = false;
                        }
                    });
                }
                else {
                    submitted.permission = countlyAuth.combinePermissionObject(submitted.permission._.u, this.permissionSets, submitted.permission);
                    countlyUserManagement.createUser(submitted, function(res) {
                        if (res.full_name) {
                            if (self.groups.length > 0) {
                                groupsModel.saveUserGroup({ email: submitted.email, group_id: self.groups }, function() {});
                            }
                            self.group = {};
                            self.$emit('refresh-table');
                            if (self.$refs.userDrawerDropzone && self.$refs.userDrawerDropzone.getAcceptedFiles() && self.$refs.userDrawerDropzone.getAcceptedFiles().length > 0) {
                                self.dropzoneOptions.member = { _id: res._id };
                                self.$refs.userDrawerDropzone.processQueue();
                                var checkUploadProcess = setInterval(function() {
                                    if (self.uploadCompleted) {
                                        CountlyHelpers.notify({
                                            message: CV.i18n('management-users.created-message'),
                                            type: 'success'
                                        });
                                        clearCheck();
                                        done();
                                    }
                                }, 1000);

                                var clearCheck = function() {
                                    clearInterval(checkUploadProcess);
                                };
                            }
                            else {
                                CountlyHelpers.notify({
                                    message: CV.i18n('management-users.created-message'),
                                    type: 'success'
                                });
                                done();
                            }
                        }
                        else if (res.length) {
                            for (var i1 = 0; i1 < res.length; i1++) {
                                CountlyHelpers.notify({
                                    message: res[i1],
                                    type: 'error'
                                });
                            }
                            self.$refs.userDrawer.isSubmitPending = false;
                        }
                        else {
                            CountlyHelpers.notify({
                                message: CV.i18n('management-applications.plugins.smth'),
                                type: 'error'
                            });
                            self.$refs.userDrawer.isSubmitPending = false;
                        }
                    });
                }
            },
            onOpen: function() {
                this.changePasswordFlag = false;
                // types
                var types = ['c', 'r', 'u', 'd'];

                // clear permission sets
                this.permissionSets = [];
                this.groups = [];
                // if it's in edit mode
                if (this.settings.editMode) {
                    // is user member of a group?
                    if (this.user.group_id && countlyGlobal.plugins.indexOf('groups') > -1) {
                        // set groups state
                        if (Array.isArray(this.user.group_id)) {
                            this.groups = this.user.group_id;
                        }
                        else {
                            this.groups = [this.user.group_id];
                        }
                        // add initial permission state for cases who unselected group
                        this.permissionSets.push({ c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});
                    }
                    // user isn't member of a group?
                    else {
                        // is user non-global admin and has user permissions for at least one app?
                        if (!this.user.global_admin && this.user.permission._.u[0].length > 0) {
                            var userAppsSets = this.user.permission._.u;

                            for (var set in userAppsSets) {
                                var appFromSet = userAppsSets[set][0];
                                var permissionSet = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};
                                for (var type in types) {
                                    for (var feature in this.features) {
                                        // TODO: these checks will be converted to helper method
                                        if (this.user.permission[types[type]] && this.user.permission[types[type]][appFromSet]) {
                                            permissionSet[types[type]].all = typeof this.user.permission[types[type]][appFromSet].all === "boolean" ? this.user.permission[types[type]][appFromSet].all : false;
                                        }
                                        else {
                                            permissionSet[types[type]].all = false;
                                        }

                                        if (!(types[type] === "r" && this.features[feature] === 'core')) {
                                            if (permissionSet[types[type]].all) {
                                                permissionSet[types[type]].allowed[this.features[feature]] = permissionSet[types[type]].all;
                                            }
                                            else if (this.user.permission[types[type]] && this.user.permission[types[type]][appFromSet] && this.user.permission[types[type]][appFromSet].allowed) {
                                                permissionSet[types[type]].allowed[this.features[feature]] = (typeof this.user.permission[types[type]][appFromSet].allowed[this.features[feature]] !== "undefined" ? this.user.permission[types[type]][appFromSet].allowed[this.features[feature]] : false);
                                            }
                                            else {
                                                permissionSet[types[type]].allowed[this.features[feature]] = false;
                                            }
                                        }
                                    }
                                }
                                this.permissionSets.push(permissionSet);
                            }
                        }
                        // is user global admin?
                        else {
                            this.permissionSets.push({ c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});
                        }
                    }
                }
                // initialize default permission sets for create mode
                else {
                    if (this.features.length === 0) {
                        CountlyHelpers.notify({
                            message: 'Somethings went wrong when fetching feature list.',
                            type: 'error'
                        });
                        return;
                    }

                    var permissionSet_ = { c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}};

                    for (var type_ in types) {
                        for (var feature_ in this.features) {
                            if (this.features[feature_] !== 'core') {
                                permissionSet_[types[type_]].allowed[this.features[feature_]] = false;
                            }
                        }
                    }

                    this.permissionSets.push(permissionSet_);
                }
            },
            onGroupChange: function(groupVal) {
                this.groups = groupVal;
                if (groupVal.length === 0) {
                    this.$refs.userDrawer.editedObject.permission._.u = [[]];
                    this.$refs.userDrawer.editedObject.permission._.a = [];
                }
            },
            onRoleChange: function(role) {
                this.roles[role.name] = role;
            }
        },
        watch: {
            'groups': function() {
                if (this.groups.length > 0) {
                    // Remove global admin role if user is assigned to any group
                    this.$refs.userDrawer.editedObject.global_admin = false;
                }

                if (this.groups.length === 0) {
                    // Restore global admin role if user is not assigned to any group
                    this.$refs.userDrawer.editedObject.global_admin = this.user.global_admin;
                }
            }
        },
        created: function() {
            for (var app in countlyGlobal.apps) {
                this.apps.push({value: countlyGlobal.apps[app]._id, label: countlyGlobal.apps[app].name });
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
                    createTitle: CV.i18n('management-users.create-new-user'),
                    editTitle: CV.i18n('management-users.edit-user'),
                    saveButtonLabel: CV.i18n('management-users.save-changes'),
                    createButtonLabel: CV.i18n('management-users.create-user'),
                    editMode: false
                },
                features: [],
                loading: true
            };
        },
        computed: {
            groupMap: function() {
                var map = {};

                if (isGroupPluginEnabled) {
                    groupsModel.data().forEach(function(group) {
                        map[group._id] = group.name;
                    });
                }

                return map;
            }
        },
        methods: {
            refresh: function() {
                var self = this;
                setTimeout(function() {
                    countlyUserManagement.fetchUsers()
                        .then(function() {
                            var usersObj = countlyUserManagement.getUsers();
                            self.users = [];
                            self.fillOutUsers(usersObj);
                        }).catch(function() {});
                }, 100);
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
                        if (typeof self.user.permission === "undefined") {
                            self.user.permission = { c: {}, r: {}, u: {}, d: {}, _: { u: [[]], a: [] }};
                        }
                        self.openDrawer("user", self.user);
                    });
            },
            fillOutUsers: function(usersObj) {
                for (var userId in usersObj) {
                    var user = usersObj[userId];

                    if (user.group_id) {
                        var groupNames = [];

                        if (Array.isArray(user.group_id)) {
                            for (var idx = 0; idx < user.group_id.length; idx++) {
                                groupNames.push(this.groupMap[user.group_id[idx]]);
                            }
                        }
                        else {
                            // There is a case where user group_id is not an array, maybe from previous versions
                            groupNames.push(this.groupMap[user.group_id]);
                        }

                        user.groupNames = groupNames.join(", ");
                    }

                    this.users.push(user);
                }
            }
        },
        mounted: function() {
            var self = this;
            $.when(countlyUserManagement.fetchUsers(), countlyUserManagement.fetchFeatures()).then(function() {
                var usersObj = countlyUserManagement.getUsers();
                self.fillOutUsers(usersObj);
                self.loading = false;
                self.features = countlyUserManagement.getFeatures().sort();
            });
        }
    });

    var MainView = countlyVue.views.create({
        template: CV.T('/core/user-management/templates/main.html'),
        mixins: [
            // call groups tab mixin from groups plugin and inject it to view
            countlyVue.container.tabsMixin({
                "externalTabs": "groups/tab"
            })
        ].concat(countlyVue.container.mixins(["vue/example"])),
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                dynamicTab: (this.$route.params && this.$route.params.tab) || "users",
                localTabs: [
                    {
                        title: CV.i18n('management-users.users'),
                        name: "users",
                        component: ManageUsersContainer,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/users"
                    }
                ]
            };
        },
        computed: {
            tabs: function() {
                var allTabs = this.localTabs.concat(this.externalTabs);
                return allTabs;
            }
        }
    });

    // wrap vue object with backbone wrapper
    var ManageUsersView = new countlyVue.views.BackboneWrapper({
        component: MainView
    });

    app.ManageUsersView = ManageUsersView;

    if (countlyAuth.validateGlobalAdmin()) {
        app.route("/manage/users", "manage-users", function() {
            var params = {
                tab: "users"
            };

            this.ManageUsersView.params = params;
            this.renderWhenReady(this.ManageUsersView);
        });

        app.route("/manage/users/:tab", "manage-users-tab", function(tab) {
            var params = {
                tab: tab
            };

            this.ManageUsersView.params = params;
            // inject current tab state to vue state
            this.renderWhenReady(this.ManageUsersView);
        });
    }

    countlyVue.container.registerData("user-management/edit-user-drawer", {
        component: Drawer
    });
})();