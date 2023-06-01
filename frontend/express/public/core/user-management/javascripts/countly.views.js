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
                case 'reset-logins':
                    countlyUserManagement.resetFailedLogins(index, function(err) {
                        if (err) {
                            CountlyHelpers.notify({
                                message: CV.i18n('management-users.reset-failed-logins-failed'),
                                type: 'error'
                            });
                            return;
                        }
                        CountlyHelpers.notify({
                            message: CV.i18n('management-users.reset-failed-logins-success'),
                            type: 'success'
                        });
                    });
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
            featuresPermissionDependency: {
                type: Object,
                default: {}
            },
            inverseFeaturesPermissionDependency: {
                type: Object,
                default: {}
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
            return {
                pictureEditMode: false,
                changePasswordFlag: false,
                apps: [],
                permissionSets: [],
                adminAppSelector: '',
                filteredFeatures: [],
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
            toggleFilteredAll: function(index) {
                var self = this;
                var crudTypes = ['c', 'r', 'u', 'd'];
                var remCrudTypes = ['c', 'r', 'u', 'd'];
                var all = this.filteredFeatures[index].all;

                if (self.filteredFeatures[index].features.length === 0) {
                    // Uncheck all CRUD types if filtered features is empty
                    crudTypes.forEach(function(type) {
                        all[type] = false;
                    });
                }
                else {
                    self.filteredFeatures[index].features.forEach(function(feature) {
                        crudTypes.forEach(function(type) {
                            // Remove the current CRUD type from the remaining CRUD types
                            if (!self.permissionSets[index][type].allowed[feature]) {
                                // Remove the current CRUD type from the remaining CRUD types
                                var idx = remCrudTypes.indexOf(type);
                                if (idx !== -1) {
                                    remCrudTypes.splice(idx, 1);
                                }
                                all[type] = false;
                            }
                        });
                        if (remCrudTypes.length === 0) {
                            return;
                        }
                    });
                    // Check the "all" checkbox for each remaining CRUD type
                    remCrudTypes.forEach(function(type) {
                        all[type] = true;
                    });
                }
            },
            search: function(index) {
                var self = this;
                var query = self.filteredFeatures[index].searchQuery;
                if (query && query !== "") {
                    query = query.toLowerCase();
                    self.filteredFeatures[index].features = self.features.filter(function(feature) {
                        return self.featureBeautifier(feature).toLowerCase().includes(query);
                    });
                }
                else {
                    self.filteredFeatures[index].features = self.features;
                }
                this.toggleFilteredAll(index);
            },
            clearSearch: function(index) {
                this.filteredFeatures[index].searchQuery = '';
                this.filteredFeatures[index].features = this.features;
                this.toggleFilteredAll(index);
            },
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
                this.filteredFeatures.push({
                    searchQuery: '',
                    features: this.features,
                    all: {
                        c: false,
                        r: false,
                        u: false,
                        d: false
                    }
                });
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
                this.filteredFeatures.splice(index, 1);
                this.$set(this.$refs.userDrawer.editedObject.permission._.u, this.$refs.userDrawer.editedObject.permission._.u.splice(index, 1));
            },
            /**
            * Set/Remove permissions for dependency features
            * @param {number} index - The index of the permission set to modify.
            * @param {string} type - The type of permission to modify (c, r, u, or d).
            * @param {string} feature - The feature to modify permissions for.
            * @example setPermissionByDependency(0, 'u', 'data_manager_transformations'), when the function is called with these params it means the user is toggling 'update' permission of data_manager_transformations for permissionSet of index 0,
            * we need to make sure incase if the user is enabling it, that the dependency permission data_manager - 'read' is also enabled, we get these dependency details from featuresPermissionDependency.
            * In case of disabling something let's say data_manager - 'read' we need to check if there are other feature(s) permission(s) which had dependency of data_manager - 'read', and disable them too, we get this inverse dependency from inverseFeaturesPermissionDependency.
            */
            setPermissionByDependency: function(index, type, feature) {
                var self = this;
                var crudTypes = {
                    'c': 'Create',
                    'r': 'Read',
                    'u': 'Update',
                    'd': 'Delete'
                };
                var permissionSets = this.permissionSets[index];
                var singleFeaturePermDependency = this.featuresPermissionDependency[feature];
                var featuresPermDependency = this.featuresPermissionDependency;
                var inverseFeaturesPermissionDependency = this.inverseFeaturesPermissionDependency[feature];

                //traverse singleFeaturePermDependency object,enable the dependency features
                var setPermission = function(permType) {
                    var preReqfeatures = singleFeaturePermDependency[permType];
                    Object.keys(preReqfeatures).forEach(function(preReqfeature) {
                        //group together similar toast msg
                        var msg = [];
                        preReqfeatures[preReqfeature].forEach(function(preReqfeaturePerm) {
                            if (!permissionSets[preReqfeaturePerm].allowed[preReqfeature]) {
                                permissionSets[preReqfeaturePerm].allowed[preReqfeature] = true;
                                msg.push(crudTypes[preReqfeaturePerm]);
                            }
                        });
                        if (msg.length) {
                            CountlyHelpers.notify({
                                message: `${msg.join(', ')} permission(s) granted automatically for` + ' ' + self.featureBeautifier(preReqfeature),
                                type: 'info'
                            });
                        }
                    });
                };

                //for enabling
                if (permissionSets[type].allowed[feature] && singleFeaturePermDependency && singleFeaturePermDependency[type]) {
                    if (type !== 'r' && singleFeaturePermDependency.r) {
                        setPermission('r');
                    }
                    setPermission(type);
                }
                //for disabling
                else if (!permissionSets[type].allowed[feature] && inverseFeaturesPermissionDependency && inverseFeaturesPermissionDependency[type]) {
                    var invPreReqfeatures = inverseFeaturesPermissionDependency[type];
                    //traverse inverseFeaturesPermissionDependency object,disable the dependency features
                    Object.keys(invPreReqfeatures).forEach(function(invPreReqfeature) {
                        if (featuresPermDependency[invPreReqfeature]) {
                            //group together similar toast msg
                            var invMsg = [];
                            Object.keys(featuresPermDependency[invPreReqfeature]).forEach(function(typeKey) {
                                var preReqPerms = featuresPermDependency[invPreReqfeature][typeKey][feature];
                                if (preReqPerms && preReqPerms.indexOf(type) !== -1) {
                                    if (permissionSets[typeKey].allowed[invPreReqfeature]) {
                                        permissionSets[typeKey].allowed[invPreReqfeature] = false;
                                        invMsg.push(crudTypes[typeKey]);
                                        //disable all other permission if Read is disabled
                                        if (typeKey === 'r') {
                                            for (var cudType of ['c', 'u', 'd']) {
                                                if (permissionSets[cudType].allowed[invPreReqfeature]) {
                                                    permissionSets[cudType].allowed[invPreReqfeature] = false;
                                                    invMsg.push(crudTypes[cudType]);
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                            if (invMsg.length) {
                                CountlyHelpers.notify({
                                    message: self.featureBeautifier(invPreReqfeature) + ' ' + `${invMsg.join(', ')} permission(s) disabled automatically due to dependency permission being disabled`,
                                    type: 'info'
                                });
                            }
                        }
                    });
                }
            },
            setPermissionByFeature: function(index, type, feature) {
                var types = ['c', 'r', 'u', 'd'];
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
                this.setPermissionByDependency(index, type, feature);
                this.toggleFilteredAll(index);
            },
            setPermissionByType: function(index, type) {
                var types = ['c', 'r', 'u', 'd'];
                var features = this.filteredFeatures[index].features;
                var all = this.filteredFeatures[index].all;

                // set true read permissions automatically if read not selected yet
                if (all[type] && type !== 'r' && !all.r) {
                    all.r = true;
                    if (features.length === this.features.length) {
                        this.permissionSets[index].r.all = true;
                    }
                    for (var feature in features) {
                        if (features[feature] !== 'core') {
                            this.permissionSets[index].r.allowed[features[feature]] = all[type];
                        }
                    }
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.read-permission-all'),
                        type: 'info'
                    });
                }
                // set false all other permissions automatically if read set as false
                if (type === 'r' && !all.r) {
                    for (var _type in types) {
                        all[types[_type]] = false;
                        if (features.length === this.features.length) {
                            this.permissionSets[index][types[_type]].all = false;
                        }
                        for (var feature1 in features) {
                            if (!(types[_type] === 'r' && features[feature1] === 'core')) {
                                this.permissionSets[index][types[_type]].allowed[features[feature1]] = false;
                            }
                        }
                    }
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.other-permissions-removed'),
                        type: 'info'
                    });
                }
                // set type specific features for other cases
                for (var feature2 in features) {
                    if (!(type === 'r' && features[feature2] === 'core')) {
                        this.permissionSets[index][type].allowed[features[feature2]] = all[type];
                    }
                    this.setPermissionByDependency(index, type, features[feature2]);
                }

                //change permission set all only if all[type] is false or if every feature is enabled
                if (!all[type]) {
                    this.permissionSets[index][type].all = all[type];
                }
                else {
                    if (features.length === this.features.length) {
                        this.permissionSets[index][type].all = true;
                    }
                    else {
                        var isTrue = true;
                        for (var featName of this.features) {
                            if (!this.permissionSets[index][type].allowed[featName]) {
                                isTrue = false;
                                break;
                            }
                        }
                        if (isTrue) {
                            this.permissionSets[index][type].all = true;
                        }
                    }
                }

                if (all[type]) {
                    CountlyHelpers.notify({
                        message: CV.i18n('management-users.future-plugins'),
                        type: 'info'
                    });
                }
                this.toggleFilteredAll(index);
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

                // clear filtered features
                this.filteredFeatures = [];

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

                // initialize filtered features
                for (let i = 0; i < this.permissionSets.length; i++) {
                    this.filteredFeatures.push({
                        features: this.features,
                        searchQuery: '',
                        all: {
                            c: this.permissionSets[i].c.all,
                            r: this.permissionSets[i].r.all,
                            u: this.permissionSets[i].u.all,
                            d: this.permissionSets[i].d.all
                        }
                    });
                }

            },
            onGroupChange: function(groupVal) {
                this.groups = groupVal;
                if (groupVal.length === 0) {
                    this.$refs.userDrawer.editedObject.permission._.u = [[]];
                    this.$refs.userDrawer.editedObject.permission._.a = [];
                    this.$refs.userDrawer.editedObject.permission.c = {};
                    this.$refs.userDrawer.editedObject.permission.r = {};
                    this.$refs.userDrawer.editedObject.permission.u = {};
                    this.$refs.userDrawer.editedObject.permission.d = {};
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
                featuresPermissionDependency: {},
                inverseFeaturesPermissionDependency: {},
                loading: true,
                groupModelData: []
            };
        },
        computed: {
            groupMap: function() {
                var map = {};

                if (isGroupPluginEnabled) {
                    this.groupModelData = groupsModel.data();
                    this.groupModelData.forEach(function(group) {
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
                    else {
                        user.groupNames = '';
                    }

                    user.dispRole = CV.i18n('management-users.global-admin');
                    if (!user.global_admin) {
                        if (user.permission && user.permission._ && user.permission._.a.length > 0) {
                            user.dispRole = CV.i18n('management-users.admin');
                        }
                        else {
                            user.dispRole = CV.i18n('management-users.user');
                        }
                    }

                    this.users.push(user);
                }
            }
        },
        mounted: function() {
            var self = this;
            if (isGroupPluginEnabled) {
                groupsModel.initialize().then(function() {
                    self.groupModelData = groupsModel.data();
                });
            }
            $.when(countlyUserManagement.fetchUsers(), countlyUserManagement.fetchFeatures()).then(function() {
                var usersObj = countlyUserManagement.getUsers();
                self.fillOutUsers(usersObj);
                self.loading = false;
                self.features = countlyUserManagement.getFeatures().sort();
                self.featuresPermissionDependency = countlyUserManagement.getFeaturesPermissionDependency();
                self.inverseFeaturesPermissionDependency = countlyUserManagement.getInverseFeaturesPermissionDependency();
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