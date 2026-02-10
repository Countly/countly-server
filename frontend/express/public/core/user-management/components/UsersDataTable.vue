<template>
<div class="manage-users-table">
  <cly-datatable-n
    test-id= "datatable-users"
    :rows="filteredRows"
    :force-loading="loading"
    :exportFormat="formatExportFunction"
    :available-dynamic-cols="tableDynamicCols"
    :persist-key="userManagementPersistKey">
      <template v-slot:header-left="selectScope">
        <cly-dropdown :width="360" ref="filterDropdown" @hide="reloadFilterValues">
            <template v-slot:trigger="dropdown">
                <cly-input-dropdown-trigger
                    v-tooltip="filterSummary"
                    :selected-options="filterSummary"
                    :focused="dropdown.focused"
                    :opened="dropdown.visible"
                    :adaptive-length="true">
                </cly-input-dropdown-trigger>
            </template>
            <template>
                <cly-form
                    :initial-edited-object="currentFilter"
                    class="user-management-filter-form"
                    ref="filterForm"
                    @submit="handleSubmitFilter">
                    <template v-slot="formScope">
                        <cly-form-step id="filter-form-step">
                            <div class="bu-m-4">
                                <div class="bu-level">
                                    <div class="bu-level-left">
                                        <div class="bu-level-item">
                                            <h4>{{i18n('management-users.view-title')}}</h4>
                                        </div>
                                    </div>
                                    <div class="bu-level-right">
                                        <div class="bu-level-item">
                                            <el-button type="text" class="cly-multi-select__reset" @click="handleResetFilterClick">{{i18n('management-users.reset-filters')}}</el-button>
                                        </div>
                                    </div>
                                </div>
                                <cly-form-field :label="i18n('management-users.role')">
                                    <el-select placement="bottom-start" class="select-full-width" v-model="formScope.editedObject.role" :placeholder="i18n('management-users.all-roles')">
                                        <el-option key="0" :label="i18n('management-users.all-roles')" :value="null"></el-option>
                                        <el-option v-for="(value, key, idx) in roleMap" :key="idx + 1" :label="value" :value="key"></el-option>
                                    </el-select>
                                </cly-form-field>
                                <cly-form-field v-if="isGroupPluginEnabled" :label="i18n('management-users.group')">
                                    <el-select placement="bottom-start" class="select-full-width" v-model="formScope.editedObject.group" :placeholder="i18n('management-users.all-groups')">
                                        <el-option key="0" :label="i18n('management-users.all-groups')" :value="null"></el-option>
                                        <el-option v-for="(value, key, idx) in groupMap" :key="idx + 1" :label="value" :value="key"></el-option>
                                    </el-select>
                                </cly-form-field>
                                <div class="bu-has-text-right bu-pt-3">
                                    <el-button type="secondary" @click="handleCancelFilterClick">{{i18n('common.cancel')}}</el-button>
                                    <el-button type="success" @click="formScope.submit()">{{i18n('common.apply')}}</el-button>
                                </div>
                            </div>
                        </cly-form-step>
                    </template>
                </cly-form>
            </template>
        </cly-dropdown>
      </template>
      <template v-slot="scope">
        <template v-for="(col, idx) in scope.dynamicCols">
          <el-table-column
            v-if="col.value === 'full_name'"
            sortable="true" prop="full_name" :label="i18n('management-users.user')">
            <template v-slot="rowScope">
              <span class="text-medium" :data-test-id="'datatable-users-user-' + rowScope.$index"> {{rowScope.row.full_name}} </span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="col.value === 'username'"
            sortable="true" prop="username" :label="i18n('management-users.username')">
            <template v-slot="rowScope">
              <span class="text-medium" :data-test-id="'datatable-users-username-' + rowScope.$index">{{rowScope.row.username}}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="col.value === 'role'"
            prop="dispRole"
            sortable="true"
            :label="i18n('management-users.role')">
            <template v-slot="rowScope">
              <span class="text-medium" :data-test-id="'datatable-users-role-' + rowScope.$index">{{rowScope.row.dispRole}}</span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="col.value === 'email'"
            sortable="true" prop="email" :label="i18n('management-users.email')">
            <template v-slot="rowScope">
              <span class="text-medium" :data-test-id="'datatable-users-email-' + rowScope.$index">{{rowScope.row.email}}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="col.value === 'group'" sortable="true" prop="groupNames" :label="i18n('management-users.group')">
            <template v-slot="rowScope">
              <div v-if="!rowScope.row.groupNames">{{i18n('management-users.group-blank')}}</div>
              <div v-else class="manage-users-table__groups" :key="index" v-for="(groupId, index) in rowScope.row.group_id">
                  <a :href="'#/manage/users/group/' + groupId + '?from=userlist'" :title="rowScope.row.groupNames.trim().split(',')[index]">
                    <span>{{rowScope.row.groupNames.trim().split(',')[index]}}</span>
                  </a>
                  <span class="manage-users-table__groups-label" v-if="index !== rowScope.row.group_id.length - 1">,</span>
              </div>
          </template>
          </el-table-column>
          <el-table-column
            v-if="col.value === 'created_at'"
            sortable="true"
            prop="created_at"
            :label="i18n('management-users.created')">
            <template v-slot="rowScope">
              <span class="text-medium" v-html="formatTimeAgo(rowScope.row.created_at)"></span>
            </template>
          </el-table-column>
          <el-table-column
            v-if="col.value === 'last_login'"
            sortable="true"
            prop="last_login"
            :label="i18n('management-users.last_login')">
            <template v-slot="rowScope">
                <span class="text-medium" :data-test-id="'datatable-users-last-login-' + rowScope.$index" v-html="rowScope.row.last_login === 0 ? i18n('management-users.not-logged-in-yet') : formatTimeAgo(rowScope.row.last_login)">
                </span>
            </template>
          </el-table-column>
        </template>
        <el-table-column type="options">
          <template v-slot="rowScope">
            <cly-more-options v-if="rowScope.row.hover" size="small" @command="handleCommand($event, rowScope.row._id)" :test-id="'more-button-' + + rowScope.$index">
              <el-dropdown-item command="edit-user" :data-test-id="'datatable-users-more-button-edit-select-' + rowScope.$index">{{ i18n('management-users.edit-user') }}</el-dropdown-item>
              <el-dropdown-item v-if="showLogs" command="show-logs" :data-test-id="'datatable-users-more-button-view-logs-select-' + rowScope.$index">{{ i18n('management-users.view-user-logs') }}</el-dropdown-item>
              <el-dropdown-item command="reset-logins" :data-test-id="'datatable-users-more-button-reset-logins-select-' + rowScope.$index">{{ i18n('management-users.reset-failed-logins') }}</el-dropdown-item>
              <el-dropdown-item command="delete-user" :data-test-id="'datatable-users-more-button-delete-user-select-' + rowScope.$index">{{ i18n('management-users.delete-user') }}</el-dropdown-item>
              <el-dropdown-item v-if="is2faEnabled(rowScope.row)" command="disable-2fa" :data-test-id="'datatable-users-more-button-disable-2fa-select-' + rowScope.$index">{{ i18n('management-users.disable-2fa-user') }}</el-dropdown-item>
            </cly-more-options>
          </template>
        </el-table-column>
      </template>
  </cly-datatable-n>
</div>
</template>

<script>
import { commonFormattersMixin, i18nMixin, i18n } from '../../../javascripts/countly/vue/core.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';
import countlyUserManagement from '../store/index.js';

import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyDropdown from '../../../javascripts/components/dropdown/dropdown.vue';
import ClyInputDropdownTrigger from '../../../javascripts/components/dropdown/input-dropdown-trigger.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';
import ClyForm from '../../../javascripts/components/form/cly-form.vue';
import ClyFormStep from '../../../javascripts/components/form/cly-form-step.vue';
import ClyFormField from '../../../javascripts/components/form/cly-form-field.vue';

var isGroupPluginEnabled = countlyGlobal.plugins.includes("groups");

export default {
    components: {
        ClyDatatableN,
        ClyDropdown,
        ClyInputDropdownTrigger,
        ClyMoreOptions,
        ClyForm,
        ClyFormStep,
        ClyFormField
    },
    mixins: [commonFormattersMixin, i18nMixin],
    props: {
        rows: Array,
        loading: Boolean,
        groupMap: Object
    },
    data: function() {
        var roleMap = {};
        roleMap.global_admin = i18n("management-users.global-admin");
        roleMap.admin = i18n("management-users.admin");
        roleMap.user = i18n("management-users.user");
        var tableDynamicCols = [
            {
                value: "full_name",
                label: i18n('management-users.user'),
                default: true
            },
            {
                value: "username",
                label: i18n('management-users.username'),
                default: false
            },
            {
                value: "role",
                label: i18n('management-users.role'),
                default: true
            },
            {
                value: "email",
                label: i18n('management-users.email'),
                default: true
            },
            {
                value: "group",
                label: i18n('management-users.group'),
                default: true
            },
            {
                value: "created_at",
                label: i18n('management-users.created'),
                default: false
            },
            {
                value: "last_login",
                label: i18n('management-users.last_login'),
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
            twoFactorAuth: countlyGlobal.plugins.indexOf('two-factor-auth') > -1,
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
                this.roleMap[this.currentFilter.role] || i18n("management-users.all-roles")
            ];

            if (isGroupPluginEnabled) {
                summary.push(this.groupMap[this.currentFilter.group] || i18n("management-users.all-groups"));
            }

            return summary.join(", ");
        }
    },
    methods: {
        is2faEnabled: function(row) {
            return countlyGlobal.member.global_admin && this.twoFactorAuth && row.two_factor_auth && row.two_factor_auth.enabled;
        },
        handleCommand: function(command, index) {
            switch (command) {
            case "delete-user":
                var self = this;

                if (index === countlyGlobal.member._id) {
                    CountlyHelpers.notify({
                        type: 'error',
                        message: i18n('management-users.cannot-delete-own-account')
                    });
                    return;
                }

                CountlyHelpers.confirm(i18n('management-users.this-will-delete-user'), "red", function(result) {
                    if (!result) {
                        CountlyHelpers.notify({
                            type: 'info',
                            message: i18n('management-users.remove-canceled')
                        });
                        return true;
                    }

                    countlyUserManagement.deleteUser(index, function() {
                        CountlyHelpers.notify({
                            message: i18n('management-users.removed-message'),
                            type: 'success'
                        });
                        self.$emit('refresh-table');
                    });
                }, [], { image: 'delete-user', title: i18n('management-users.warning') });
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
                            message: i18n('management-users.reset-failed-logins-failed'),
                            type: 'error'
                        });
                        return;
                    }
                    CountlyHelpers.notify({
                        message: i18n('management-users.reset-failed-logins-success'),
                        type: 'success'
                    });
                });
                break;
            case 'disable-2fa':
                countlyUserManagement.disableTwoFactorAuth(index, function(err) {
                    if (err) {
                        CountlyHelpers.notify({
                            message: i18n('two-factor-auth.faildisable_title'),
                            type: 'error'
                        });
                        return;
                    }
                    CountlyHelpers.notify({
                        message: i18n('two-factor-auth.disable_title'),
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
            for (var idx = 0; idx < tableData.length; idx++) {
                var item = {};
                item[i18n('management-users.user').toUpperCase()] = tableData[idx].full_name;
                item[i18n('management-users.username').toUpperCase()] = tableData[idx].username;
                item[i18n('management-users.role').toUpperCase()] = tableData[idx].global_admin ? i18n('management-users.global-admin') : ((tableData[idx].permission && tableData[idx].permission._ && tableData[idx].permission._.a.length > 0) ? i18n('management-users.admin') : i18n('management-users.user'));
                item[i18n('management-users.email').toUpperCase()] = tableData[idx].email;
                item[i18n('management-users.group').toUpperCase()] = tableData[idx].groupNames ? tableData[idx].groupNames : '';
                item[i18n('management-users.created').toUpperCase()] = countlyCommon.formatTimeAgoText(tableData[idx].created_at).text;
                item[i18n('management-users.last_login').toUpperCase()] = tableData[idx].last_login === 0 ? i18n('management-users.not-logged-in-yet') : countlyCommon.formatTimeAgoText(tableData[idx].last_login).text;

                table.push(item);
            }
            return table;
        },
    }
};
</script>
