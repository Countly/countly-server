<template>
    <cly-drawer
        id="preset-drawer"
        ref="drawerScope"
        @submit="onSubmit"
        @copy="onCopy"
        @close="onClose"
        :title="title"
        :saveButtonLabel="saveButtonLabel"
        v-bind="controls">
        <template v-slot:default="drawerScope">
            <cly-form-step id="preset-drawer-form">

                <cly-form-field :label="i18n('management.preset.date-range')" name="range" rules="required" v-slot:default>
                    <cly-date-picker
                        timestampFormat="ms"
                        type="daterange"
                        :display-shortcuts="false"
                        :min-input-width="336"
                        :max-input-width="336"
                        v-model="period"
                        label-mode-prop="absolute"
                        :allow-presets="false"
                        @change-label="handleLabelChanged"
                    >
                    </cly-date-picker>
                </cly-form-field>

                <cly-form-field v-if="showExcludeCurrentDay(drawerScope.editedObject.range)" name="exclude-current-day" style="padding-top: 0;">
                    <el-checkbox v-model="drawerScope.editedObject.exclude_current_day">{{i18n('management.preset.exclude-current-day')}}</el-checkbox>
                    <div class="text-small  color-cool-gray-50 bu-mt-1 bu-pl-5">
                        {{i18n('management.preset.exclude-current-day.description')}}
                    </div>
                </cly-form-field>

                <cly-form-field :label="i18n('management.preset.name')" name="name" rules="required" v-slot:default>
                    <el-input
                        v-model="drawerScope.editedObject.name"
                        :placeholder="i18n('management.preset.placeholder')">
                    </el-input>
                </cly-form-field>

                <cly-form-field :label="i18n('management.preset.visibility')" name="visbility" rules="required">
                    <el-radio-group
                        :disabled="!canShare"
                        v-model="drawerScope.editedObject.share_with"
                        class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned"
                    >
                        <el-radio
                            border
                            class="is-autosized"
                            v-for="(item) in sharingOptions"
                            :label="item.value"
                            :key="item.value">
                            <div>
                                {{item.name}}
                            </div>
                        </el-radio>
                    </el-radio-group>
                </cly-form-field>


                <div v-if="drawerScope.editedObject.share_with === 'selected-users'">
                    <div class="text-big font-weight-bold">
                        {{i18n('management.preset.user-permissions')}}
                        <cly-tooltip-icon tooltip="Set the User permissions"></cly-tooltip-icon>
                    </div>
                    <cly-form-field :label="i18n('management.preset.users-edit-permission')" :subheading="i18n('management.preset.users-edit-description')">
                        <cly-select-email :disabled="!canShare" v-model="sharedEmailEdit" :placeholder="canShare ? i18n('management.preset.enter-user-email') : i18n('dashbaords.sharing-disabled')"></cly-select-email>
                    </cly-form-field>
                    <cly-form-field :label="i18n('management.preset.users-view-permission')" :subheading="i18n('management.preset.users-view-description')">
                        <cly-select-email :disabled="!canShare" v-model="sharedEmailView" :placeholder="canShare ? i18n('management.preset.enter-user-email') : i18n('dashbaords.sharing-disabled')"></cly-select-email>
                    </cly-form-field>
                </div>

                <div v-if="(drawerScope.editedObject.share_with === 'selected-users') && groupSharingAllowed">
                    <div class="text-big font-weight-bold">
                        {{i18n('management.preset.user-group-permission')}}
                        <cly-tooltip-icon tooltip="Set the User group permissions"></cly-tooltip-icon>
                    </div>
                    <cly-form-field
                        name="shared_user_groups_edit"
                        :label="i18n('management.preset.users-edit-permission')"
                        :subheading="i18n('management.preset.users-edit-description')">
                        <el-select
                            :key="elSelectKey"
                            multiple
                            :disabled="!canShare"
                            v-model="sharedGroupEdit"
                            :placeholder="canShare ? i18n('management.preset.select-user-group') : i18n('management.preset.sharing-disabled')"
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
                        :label="i18n('management.preset.users-view-permission')"
                        :subheading="i18n('management.preset.users-view-description')">
                        <el-select
                            :key="elSelectKey"
                            multiple
                            :disabled="!canShare"
                            v-model="sharedGroupView"
                            :placeholder="canShare ? i18n('management.preset.select-user-group') : i18n('management.preset.sharing-disabled')"
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

            </cly-form-step>
        </template>
    </cly-drawer>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyPresets from '../store/index.js';

import ClyDrawer from '../../../javascripts/components/drawer/cly-drawer.vue';
import ClyFormStep from '../../../javascripts/components/form/cly-form-step.vue';
import ClyFormField from '../../../javascripts/components/form/cly-form-field.vue';
import ClyDatePicker from '../../../javascripts/components/date/date-picker.vue';
import ClyTooltipIcon from '../../../javascripts/components/helpers/cly-tooltip-icon.vue';
import ClySelectEmail from '../../../javascripts/components/input/select-email.vue';

var CV = countlyVue;
var AUTHENTIC_GLOBAL_ADMIN = (countlyGlobal.member.global_admin && ((countlyGlobal.member.restrict || []).indexOf("#/manage/configurations") < 0));

var sharingOptions = [
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

export { sharingOptions, AUTHENTIC_GLOBAL_ADMIN };

export default {
    components: {
        ClyDrawer,
        ClyFormStep,
        ClyFormField,
        ClyDatePicker,
        ClyTooltipIcon,
        ClySelectEmail
    },
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
            window.groupsModel.initialize().then(function() {
                var groups = window._.sortBy(window.groupsModel.data(), 'name');

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
};
</script>
