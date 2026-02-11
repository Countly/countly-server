<template>
<cly-drawer
    @submit="onSubmit"
    @copy="onCopy"
    @close="onClose"
    :title="title"
    test-id="create-dashboard-drawer"
    :saveButtonLabel="saveButtonLabel"
    v-bind="controls">
    <template v-slot:default="drawerScope">
        <cly-form-step id="dashboards-drawer">
            <cly-form-field :label="i18nM('dashboards.dashboard-name')" name="name" rules="required" v-slot:default test-id="dashboard-name-input-label">
                <el-input
                    v-model="drawerScope.editedObject.name"
                    test-id="dashboard-name-input"
                    :placeholder="i18nM('placeholder.dashboards.dashboard-name')">
                </el-input>
            </cly-form-field>
            <div class="text-big font-weight-bold" data-test-id="dashboard-visibility-label">
                {{i18nM('dashboards.share-with')}}
                <cly-tooltip-icon :tooltip="i18nM('dashboards.share-with-tooltip-content')" data-test-id="dashboard-visibility-tooltip"></cly-tooltip-icon>
            </div>
            <cly-form-field name="share_with" rules="required">
                <el-radio-group :disabled="!canShare" v-model="drawerScope.editedObject.share_with" style="width: 100%;">
                    <el-radio
                        border
                        class="is-autosized-vstack"
                        :test-id="'dashboard-visibility-option-' + item.value"
                        v-for="(item) in constants.sharingOptions"
                        :label="item.value"
                        :key="item.value">
                        <div>
                            {{item.name}}
                        </div>
                        <div class="text-small color-cool-gray-50">
                            {{item.description}}
                        </div>
                    </el-radio>
                </el-radio-group>
            </cly-form-field>

            <div v-if="drawerScope.editedObject.share_with === 'selected-users'">
                <div class="text-big font-weight-bold" data-test-id="dashboard-user-permissions-label">
                    {{i18nM('dashboards.user-permissions')}}
                    <cly-tooltip-icon :tooltip="i18nM('dashboards.user-permissions-tooltip-content')" data-test-id="dashboard-user-permissions-tooltip"></cly-tooltip-icon>
                </div>
                <cly-form-field :label="i18nM('dashboards.users-edit-permission')" :subheading="i18nM('dashboards.users-edit-description')" test-id="dashboard-users-edit-permission-label">
                    <cly-select-email :disabled="!canShare" v-model="sharedEmailEdit" :placeholder="canShare ? i18nM('dashboards.enter-user-email') : i18nM('dashbaords.sharing-disabled')" test-id="edit-permission-user-email-input"></cly-select-email>
                </cly-form-field>
                <cly-form-field :label="i18nM('dashboards.users-view-permission')" :subheading="i18nM('dashboards.users-view-description')" test-id="dashboard-users-view-permission-label">
                    <cly-select-email :disabled="!canShare" v-model="sharedEmailView" :placeholder="canShare ? i18nM('dashboards.enter-user-email') : i18nM('dashbaords.sharing-disabled')" test-id="view-permission-user-email-input"></cly-select-email>
                </cly-form-field>
            </div>

            <div v-if="(drawerScope.editedObject.share_with === 'selected-users') && groupSharingAllowed">
                <div class="text-big font-weight-bold" data-test-id="dashboard-user-group-permissions-label">
                    {{i18nM('dashboards.user-group-permission')}}
                    <cly-tooltip-icon :tooltip="i18nM('dashboards.user-group-permission-tooltip-content')" data-test-id="dashboard-user-group-permission-tooltip"></cly-tooltip-icon>
                </div>
                <cly-form-field
                    name="shared_user_groups_edit"
                    test-id="dashboard-user-group-edit-permission-label"
                    :label="i18nM('dashboards.users-edit-permission')"
                    :subheading="i18nM('dashboards.users-edit-description')">
                    <el-select
                        :key="elSelectKey"
                        test-id="dashboard-user-group-edit-permission"
                        multiple
                        :disabled="!canShare"
                        v-model="sharedGroupEdit"
                        :placeholder="canShare ? i18nM('placeholder.dashboards.select-user-group') : i18nM('dashbaords.sharing-disabled')"
                        style="width: 100%;">
                        <el-option
                            v-for="(item) in allGroups"
                            :value="item.value"
                            :label="item.name"
                            :key="item.value">
                        </el-option>
                    </el-select>
                </cly-form-field>
                <cly-form-field
                    name="shared_user_groups_view"
                    test-id="dashboard-user-group-view-permission-label"
                    :label="i18nM('dashboards.users-view-permission')"
                    :subheading="i18nM('dashboards.users-view-description')">
                    <el-select
                        :key="elSelectKey"
                        test-id="dashboard-user-group-view-permission"
                        multiple
                        :disabled="!canShare"
                        v-model="sharedGroupView"
                        :placeholder="canShare ? i18nM('placeholder.dashboards.select-user-group') : i18nM('dashbaords.sharing-disabled')"
                        style="width: 100%;">
                        <el-option
                            v-for="(item) in allGroups"
                            :value="item.value"
                            :label="item.name"
                            :key="item.value">
                        </el-option>
                    </el-select>
                </cly-form-field>
            </div>

            <div class="text-big font-weight-bold bu-mt-4" data-test-id="dashboard-additional-settings-label">
                {{i18nM('dashboards.additional-settings')}}
            </div>
            <cly-form-field name="send-email">
                <el-checkbox v-model="drawerScope.editedObject.send_email_invitation" test-id="dashboard-send-email-checkbox">{{i18nM('dashboards.send-email')}}</el-checkbox>
            </cly-form-field>
            <cly-form-field name="use-refresh-rate">
                <el-checkbox v-model="drawerScope.editedObject.use_refresh_rate" test-id="dashboard-use-refresh-rate-checkbox">
                    {{ i18nM("dashboards.custom-refresh-rate") }}
                    <cly-tooltip-icon :tooltip="i18nM('dashboards.custom-refresh-rate-description')" data-test-id="dashboard-custom-refresh-rate-tooltip"></cly-tooltip-icon>
                </el-checkbox>
                <cly-form-field
                    v-if="drawerScope.editedObject.use_refresh_rate"
                    name="title"
                    :rules="drawerScope.editedObject.use_refresh_rate ? 'required' : ''">
                    <el-input
                        v-model="drawerScope.editedObject.refreshRate"
                        test-id="dashboard-custom-refresh-rate-input"
                        placeholder="">
                    </el-input>
                </cly-form-field>
            </cly-form-field>

        </cly-form-step>
    </template>
</cly-drawer>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import countlyDashboards from '../store/index.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';

var AUTHENTIC_GLOBAL_ADMIN = (countlyGlobal.member.global_admin && ((countlyGlobal.member.restrict || []).indexOf("#/manage/configurations") < 0));

export default {
    mixins: [i18nMixin],
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
            sharedEmailEdit: [],
            sharedEmailView: [],
            sharedGroupEdit: [],
            sharedGroupView: [],
            allGroups: []
        };
    },
    computed: {
        constants: function() {
            var allSharingOptions = [
                {
                    value: "all-users",
                    name: this.i18nM("dashboards.share.all-users"),
                    description: this.i18nM("dashboards.share.all-users.description"),
                },
                {
                    value: "selected-users",
                    name: this.i18nM("dashboards.share.selected-users"),
                    description: this.i18nM("dashboards.share.selected-users.description"),
                },
                {
                    value: "none",
                    name: this.i18nM("dashboards.share.none"),
                    description: this.i18nM("dashboards.share.none.description"),
                }
            ];

            var allowPublicDashboards = countlyGlobal.allow_public_dashboards !== false;
            var sharingOptions = allowPublicDashboards ? allSharingOptions : allSharingOptions.filter(function(option) {
                return option.value !== "all-users";
            });

            return {
                sharingOptions: sharingOptions
            };
        },
        canShare: function() {
            var canShare = this.sharingAllowed && (this.controls.initialEditedObject.is_owner || AUTHENTIC_GLOBAL_ADMIN);
            return canShare;
        },
        elSelectKey: function() {
            var key = this.allGroups.map(function(g) {
                return g._id;
            }).join(",");

            return key;
        }
    },
    methods: {
        onSubmit: function(doc) {
            var action = "countlyDashboards/create";
            var __action = doc.__action;

            if (__action === "edit") {
                action = "countlyDashboards/update";
            }

            if (__action === "duplicate") {
                action = "countlyDashboards/duplicate";
            }

            var empty = countlyDashboards.factory.dashboards.getEmpty();
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
                    if (__action === "duplicate" ||
                    __action === "create") {
                        notify({
                            message: "Dashboard created successfully!",
                            type: "success"
                        });

                        window.app.navigate('#/custom/' + id, true);
                    }

                    if (__action === "edit") {
                        notify({
                            message: "Dashboard edited successfully!",
                            type: "success"
                        });
                    }
                }
            });
        },
        onCopy: function(doc) {
            this.title = this.i18nM("dashboards.create-new-dashboard-heading");
            this.saveButtonLabel = this.i18nM("dashboards.create-dashboard");

            if (doc.__action === "edit") {
                this.title = this.i18nM("dashboards.edit-dashboard-heading");
                this.saveButtonLabel = this.i18nM("dashboards.save-dashboard");
            }

            if (doc.__action === "duplicate") {
                this.title = this.i18nM("dashboards.duplicate-dashboard-heading");
                this.saveButtonLabel = this.i18nM("dashboards.create-dashboard");
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
        },
        onClose: function() {
            this.$store.dispatch("countlyDashboards/requests/drawerOpenStatus", false);
        },
    },
    mounted: function() {
        if (this.groupSharingAllowed) {
            var self = this;
            window.groupsModel.initialize().then(function() {
                var groups = window.groupsModel.data().slice().sort(function(a, b) {
                    return (a.name || "").localeCompare(b.name || "");
                });

                var userGroups = groups.map(function(g) {
                    return {
                        name: g.name,
                        value: g._id
                    };
                });

                self.allGroups = userGroups;
            });
        }
    }
};
</script>
