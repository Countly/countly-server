<template>
<div v-bind:class="[componentId]" class="user-management-view">
    <cly-header :title="i18n('management-users.view-title')">
        <template v-slot:header-right>
            <div class="bu-level-item">
                <el-button class="manage-users-action-btn" @click="createUser()" type="success" size="small" icon="el-icon-circle-plus" data-test-id="create-user-button">
                    {{ i18n('management-users.create-user') }}
                </el-button>
            </div>
        </template>
    </cly-header>
    <cly-main>
        <data-table :loading="loading" @refresh-table="refresh" @edit-user="onEditUser" :rows="users" :group-map="groupMap"></data-table>
    </cly-main>
    <drawer @refresh-table="refresh" :user="user" :features="features" :featuresPermissionDependency="featuresPermissionDependency" :inverseFeaturesPermissionDependency="inverseFeaturesPermissionDependency" :settings="drawerSettings" :controls="drawers.user"></drawer>
</div>
</template>

<script>
import { i18nMixin, i18n, mixins as vueMixins } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyUserManagement from '../store/index.js';
import UsersDataTable from './UsersDataTable.vue';
import UserDrawer from './UserDrawer.vue';

var isGroupPluginEnabled = countlyGlobal.plugins.includes("groups");

var groupsModelRef = null;
var groupsModelPromise = import('../../../../../../plugins/groups/frontend/public/store/index.js')
    .then(function(mod) { groupsModelRef = mod.default; return mod.default; })
    .catch(function() { return null; });

export default {
    components: {
        'data-table': UsersDataTable,
        'drawer': UserDrawer
    },
    mixins: [i18nMixin, vueMixins.hasDrawers("user")],
    data: function() {
        return {
            users: [],
            user: {},
            currentTab: 'users',
            appId: countlyCommon.ACTIVE_APP_ID,
            drawerSettings: {
                createTitle: i18n('management-users.create-new-user'),
                editTitle: i18n('management-users.edit-user'),
                saveButtonLabel: i18n('management-users.save-changes'),
                createButtonLabel: i18n('management-users.create-user'),
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

            if (isGroupPluginEnabled && groupsModelRef) {
                this.groupModelData = groupsModelRef.data();
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
                        groupNames.push(this.groupMap[user.group_id]);
                    }

                    user.groupNames = groupNames.join(", ");
                }
                else {
                    user.groupNames = '';
                }

                user.dispRole = i18n('management-users.global-admin');
                if (!user.global_admin) {
                    if (user.permission && user.permission._ && user.permission._.a.length > 0) {
                        user.dispRole = i18n('management-users.admin');
                    }
                    else {
                        user.dispRole = i18n('management-users.user');
                    }
                }

                this.users.push(user);
            }
        }
    },
    mounted: function() {
        var self = this;
        if (isGroupPluginEnabled) {
            groupsModelPromise.then(function(groupsModel) {
                if (!groupsModel) return;
                groupsModel.initialize().then(function() {
                    self.groupModelData = groupsModel.data();
                });
            });
        }
        Promise.all([countlyUserManagement.fetchUsers(), countlyUserManagement.fetchFeatures()]).then(function() {
            var usersObj = countlyUserManagement.getUsers();
            self.fillOutUsers(usersObj);
            self.loading = false;
            self.features = countlyUserManagement.getFeatures().sort();
            self.featuresPermissionDependency = countlyUserManagement.getFeaturesPermissionDependency();
            self.inverseFeaturesPermissionDependency = countlyUserManagement.getInverseFeaturesPermissionDependency();
        });
    }
};
</script>
