<template>
    <div>
        <cly-empty-view
            v-if="(rowTableRows.length === 0 && initialized)"
            test-id="alerts-table"
            :title="i18n('alerts.empty-title')"
            :subTitle="i18n('alerts.empty-subtitle')"
            :actionTitle="i18n('alerts.empty-action-button-title')"
            :hasAction="canUserCreate"
            :actionFunc="createAlert" />
        <cly-section v-else>
            <cly-datatable-n
                :available-dynamic-cols="tableDynamicCols"
                :force-loading="!initialized"
                test-id="alerts-table"
                class="cly-vue-alerts-table"
                :tracked-fields="localTableTrackedFields"
                :rows="tableRows"
                :resizable="false"
                :default-sort="{prop: 'createdAt', order: 'descending'}">
                <template v-slot:header-left="scope">
                    <div class="bu-mr-2">
                        <el-radio-group :plain="true" v-model="tableFilterStatus">
                            <el-radio-button label="all">{{ i18n('alerts.status-all') }}</el-radio-button>
                            <el-radio-button label="enabled">{{ i18n('alerts.status-enabled') }}</el-radio-button>
                            <el-radio-button label="disabled">{{ i18n('alerts.status-disabled') }}</el-radio-button>
                        </el-radio-group>
                    </div>
                    <div class="alerts-table-app-selector">
                        <cly-select-x
                            :placeholder="i18n('alert.all-applications')"
                            test-id="select-app-combobox"
                            mode="multi-check"
                            v-model="filteredApps"
                            :options="appsSelectorOption">
                        </cly-select-x>
                    </div>
                </template>
                <template v-slot="scope">
                    <el-table-column type="switch" fixed="left" width="88" prop="enabled">
                        <template v-slot="rowScope">
                            <el-switch
                                v-tooltip="{ content: rowScope.row.enabled ? i18n('alerts.alert-is-enabled') : i18n('alerts.alert-is-disabled') }"
                                :value="rowScope.row.enabled"
                                :disabled="!rowScope.row._canUpdate"
                                class="bu-ml-4 bu-mr-2"
                                :test-id="'status-row-' + rowScope.$index"
                                @input="scope.patch(rowScope.row, {enabled: !rowScope.row.enabled})">
                            </el-switch>
                        </template>
                    </el-table-column>

                    <el-table-column fixed min-width="240" prop="alertName" :label="i18n('alert.Alert_Name')" sortable="true">
                        <template slot-scope="scope">
                            <div style="text-overflow: ellipsis; overflow: hidden;" :data-test-id="'datatable-alert-name-' + scope.$index" v-html="scope.row.alertName"></div>
                        </template>
                    </el-table-column>

                    <template v-for="(col, idx) in scope.dynamicCols">
                        <el-table-column :key="'col-' + idx" min-width="175" v-if="col.value === 'appNameList'" prop="appNameList" sortable="true" :label="i18n('alert.Application')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-application-' + scope.$index">
                                    {{ scope.row.appNameList }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column :key="'col2-' + idx" min-width="415" v-if="col.value === 'conditionText'" prop="conditionText" sortable="true" :label="i18n('alert.Condition')">
                            <template slot-scope="scope">
                                <span :data-test-id="'datatable-condition-' + scope.$index">
                                    {{ unescapeHtml(scope.row.condtionText) }}
                                </span>
                            </template>
                        </el-table-column>
                    </template>

                    <el-table-column min-width="130" sortable="true" prop="createdByUser" :label="i18n('alert.CreateBy')">
                        <template slot-scope="scope">
                            <div class="bu-level">
                                <div class="bu-level-left">
                                    <div class="is-created-by-col" :data-test-id="'datatable-created-by-' + scope.$index">
                                        {{ scope.row.createdByUser }}
                                    </div>
                                </div>
                            </div>
                        </template>
                    </el-table-column>

                    <el-table-column type="options" test-id="more-button-area">
                        <template v-slot="rowScope">
                            <cly-more-options
                                :test-id="'row-' + rowScope.$index"
                                v-if="rowScope.row.hover && (rowScope.row._canUpdate || rowScope.row._canDelete)"
                                size="small"
                                @command="handleAlertEditCommand($event, rowScope)">
                                <el-dropdown-item
                                    :data-test-id="'datatable-edit-button-' + rowScope.$index"
                                    v-if="rowScope.row._canUpdate"
                                    icon="el-icon-document-copy"
                                    command="edit-comment">
                                    {{ i18n('alert.Edit') }}
                                </el-dropdown-item>
                                <el-dropdown-item
                                    :data-test-id="'datatable-delete-button-' + rowScope.$index"
                                    v-if="rowScope.row._canDelete"
                                    icon="el-icon-delete"
                                    command="delete-comment">
                                    {{ i18n('alert.Delete') }}
                                </el-dropdown-item>
                            </cly-more-options>
                        </template>
                    </el-table-column>
                </template>
                <template v-slot:bottomline="scope">
                    <cly-diff-helper :diff="scope.diff" @discard="scope.unpatch()" @save="updateStatus(scope)">
                    </cly-diff-helper>
                </template>
            </cly-datatable-n>
        </cly-section>
    </div>
</template>

<script>
import countlyVue, { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { unescapeHtml } from '../../../../../frontend/express/public/javascripts/countly/countly.common.utils.js';

const ALERTS_FEATURE_NAME = "alerts";

export default {
    mixins: [countlyVue.mixins.i18n, countlyVue.mixins.auth(ALERTS_FEATURE_NAME)],
    props: {
        callCreateAlertDrawer: { type: Function, default: function() {} },
    },
    data: function() {
        var appsSelectorOption = [];
        for (var id in countlyGlobal.apps) {
            appsSelectorOption.push({
                label: countlyGlobal.apps[id].name,
                value: id,
            });
        }

        return {
            appsSelectorOption: appsSelectorOption,
            filterStatus: "all",
            filteredApps: [],
            tableFilterStatus: "all",
            tableDynamicCols: [
                {
                    value: "appNameList",
                    label: "Application",
                    default: true
                },
                {
                    value: "conditionText",
                    label: "Condition",
                    default: true
                }
            ],
            localTableTrackedFields: ["enabled"],
            isAdmin: countlyGlobal.member.global_admin,
            deleteElement: null,
        };
    },
    computed: {
        tableRows: function() {
            var rows = this.$store.getters["countlyAlerts/table/all"];
            if (this.tableFilterStatus !== "all") {
                var enabled = this.tableFilterStatus === "enabled" ? true : false;
                rows = rows.filter(function(r) {
                    return r.enabled === enabled;
                });
            }
            if (this.filteredApps.length > 0) {
                var self = this;
                rows = rows.filter(function(r) {
                    var matched = false;
                    self.filteredApps.forEach(function(a) {
                        if (r.selectedApps.indexOf(a) >= 0) {
                            matched = true;
                        }
                    });
                    return matched;
                });
            }
            return rows;
        },
        initialized: function() {
            var result = this.$store.getters["countlyAlerts/table/getInitialized"];
            return result;
        },
        rowTableRows: function() {
            var rows = this.$store.getters["countlyAlerts/table/all"];
            return rows;
        },
    },
    methods: {
        i18n: i18n,
        unescapeHtml: unescapeHtml,
        createAlert: function() {
            this.callCreateAlertDrawer();
        },
        handleAlertEditCommand: function(command, scope) {
            if (command === "edit-comment") {
                var data = Object.assign({}, scope.row);
                this.$parent.$parent.openDrawer("home", data);
            }
            else if (command === "delete-comment") {
                var self = this;
                this.deleteElement = scope.row;
                var deleteMessage = i18n("alert.delete-confirm", "<b>" + this.deleteElement.alertName + "</b>");
                CountlyHelpers.confirm(deleteMessage, "red", function(result) {
                    if (!result) {
                        return true;
                    }
                    if (self.deleteElement.alertDataType === "onlineUsers") {
                        self.$store.dispatch("countlyAlerts/deleteOnlineUsersAlert", {
                            alertID: self.deleteElement._id,
                            appid: self.deleteElement.selectedApps[0],
                        });
                    }
                    else {
                        self.$store.dispatch("countlyAlerts/deleteAlert", {
                            alertID: self.deleteElement._id,
                            appid: self.deleteElement.selectedApps[0],
                        }).then(() => {
                            CountlyHelpers.notify({
                                title: 'Success',
                                message: i18n('alerts.delete-alert-success'),
                                type: 'success'
                            });
                        }).catch(() => {
                            CountlyHelpers.notify({
                                message: i18n('alerts.delete-alert-fail'),
                                type: 'error',
                                width: 'large',
                            });
                        });
                    }
                });
            }
        },
        updateStatus: function(scope) {
            var diff = scope.diff;
            var status = {};
            diff.forEach(function(item) {
                status[item.key] = item.newValue;
            });
            var alertStatus = {};
            var onlineUsersAlertStatus = {};
            var rows = this.$store.getters["countlyAlerts/table/all"];
            for (var i = 0; i < rows.length; i++) {
                if (status[rows[i]._id] !== undefined) {
                    if (rows[i].alertDataType === "onlineUsers") {
                        onlineUsersAlertStatus[rows[i]._id] = status[rows[i]._id];
                    }
                    else {
                        alertStatus[rows[i]._id] = status[rows[i]._id];
                    }
                }
            }
            var self = this;
            self.scope = scope;
            self.onlineUsersAlertStatus = onlineUsersAlertStatus;
            this.$store
                .dispatch("countlyAlerts/table/updateStatus", alertStatus)
                .then(function() {
                    return self.$store
                        .dispatch("countlyAlerts/table/updateOnlineusersAlertStatus", self.onlineUsersAlertStatus)
                        .then(function() {
                            return self.$store.dispatch("countlyAlerts/table/fetchAll");
                        });
                });
        },
        refresh: function() {
            // Refresh handled by parent
        },
    },
};
</script>