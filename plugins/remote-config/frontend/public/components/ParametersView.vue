<template>
    <div>
        <cly-header :title="i18n('remote-config.title')">
            <template v-slot:header-right>
                <div
                    class="bu-level-item"
                    v-if="hasCreateRight"
                >
                    <el-button
                        :disabled="isParamterLimitExceeded"
                        @click="create"
                        type="success"
                        size="small"
                        icon="el-icon-circle-plus"
                        data-test-id="add-parameter-button"
                    >
                        {{ i18n('remote-config.add-parameter-title') }}
                    </el-button>
                </div>
            </template>
        </cly-header>
        <cly-main>
            <div
                class="bu-mr-5"
                v-if="isParamterLimitExceeded"
            >
                <cly-notification
                    class="bu-mb-5"
                    :text="i18n('remote-config.maximum_parameters_added')"
                    color="light-warning"
                />
            </div>
            <cly-datatable-n
                test-id="remote-config"
                :rows="tableRows"
                :exportFormat="formatExportFunction"
                :force-loading="isTableLoading"
                class="cly-vue-remote-config-home-table"
                ref="table"
                @row-click="handleTableRowClick"
                :row-class-name="tableRowClassName"
            >
                <template v-slot:default="scope">
                    <el-table-column
                        :test-id="'remote-config-expand-' + scope.$index"
                        type="expand"
                        min-width="50"
                    >
                        <template v-slot="props">
                            <cly-section>
                                <condition-stats
                                    :test-id="'datatable-remote-config-' + props.$index"
                                    :parameter="props.row"
                                />
                            </cly-section>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="160"
                        prop="parameter_key"
                        :label="i18n('remote-config.parameter')"
                        sortable="custom"
                    >
                        <template v-slot:default="rowScope">
                            <div>
                                <div
                                    class="cly-vue-remote-config-conditions-drawer__margin-bottom"
                                    :data-test-id="'datatable-remote-config-parameter-' + rowScope.$index"
                                >
                                    {{ rowScope.row.parameter_key }}
                                </div>
                                <div
                                    v-if="isDrillEnabled"
                                    class="color-cool-gray-40 text-small"
                                >
                                    <span :data-test-id="'datatable-remote-config-number-of-condition-' + rowScope.$index">
                                        {{ getNumberOfConditionsText(rowScope.row.conditions) }}
                                    </span>
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="160"
                        prop="status"
                        :label="i18n('remote-config.parameter.status')"
                    >
                        <template v-slot:default="rowScope">
                            <div>
                                <div class="cly-vue-remote-config-conditions-drawer__margin-bottom">
                                    <cly-status-tag
                                        v-if="rowScope.row.status==='Stopped'"
                                        :text="i18n('remote-config.parameter.disabled')"
                                        color="red"
                                        :data-test-id="'datatable-remote-config-status-' + rowScope.$index"
                                    />
                                    <cly-status-tag
                                        v-else-if="rowScope.row.status==='Expired'"
                                        :text="i18n('remote-config.parameter.expired')"
                                        color="yellow"
                                        :data-test-id="'datatable-remote-config-status-' + rowScope.$index"
                                    />
                                    <cly-status-tag
                                        v-else
                                        :text="i18n('remote-config.parameter.enabled')"
                                        color="blue"
                                        :data-test-id="'datatable-remote-config-status-' + rowScope.$index"
                                    />
                                </div>
                                <div
                                    class="color-cool-gray-40 text-small"
                                    v-if="rowScope.row.expiry_dttm"
                                    :data-test-id="'datatable-remote-config-expire-date-' + rowScope.$index"
                                >
                                    {{ i18n('remote-config.expire.date') }} {{ getDate(rowScope.row.expiry_dttm) }}
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="160"
                        prop="description"
                        :label="i18n('remote-config.description')"
                    >
                        <template v-slot:default="rowScope">
                            <div :data-test-id="'datatable-remote-config-description-' + rowScope.$index">
                                {{ displayDescription(rowScope.row.description) }}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="160"
                        prop="ts"
                        :label="i18n('remote-config.parameter.created')"
                        sortable="custom"
                    >
                        <template v-slot:default="rowScope">
                            <div>
                                <div
                                    class="cly-vue-remote-config-conditions-drawer__margin-bottom"
                                    :data-test-id="'datatable-remote-config-created-date-' + rowScope.$index"
                                >
                                    {{ getDate(rowScope.row.ts) }}
                                </div>
                                <div
                                    class="color-cool-gray-40 text-small"
                                    :data-test-id="'datatable-remote-config-created-time-' + rowScope.$index"
                                >
                                    {{ getTime(rowScope.row.ts) }}
                                </div>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="160"
                        prop="abStatus"
                        :label="i18n('remote-config.parameter.ab.status')"
                    >
                        <template v-slot:default="rowScope">
                            <div :data-test-id="'datatable-remote-config-ab-status-' + rowScope.$index">
                                {{ rowScope.row.abStatus || "-" }}
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column
                        min-width="160"
                        v-if="hasUpdateRight || hasDeleteRight"
                        type="options"
                    >
                        <template v-slot="rowScope">
                            <cly-more-options
                                :test-id="'datatable-remote-config-' + rowScope.$index"
                                v-if="rowScope.row.hover"
                                size="small"
                                v-tooltip.left="rowScope.row.editable ? '' : i18n('remote-config.parameter.action-tooltip-content')"
                                :disabledButton="rowScope.row.editable ? false : true"
                                @command="handleCommand($event, scope, rowScope.row)"
                            >
                                <template v-if="hasUpdateRight && rowScope.row.editable">
                                    <el-dropdown-item
                                        v-if="rowScope.row.status==='Stopped' || rowScope.row.status==='Expired'"
                                        command="enable"
                                        :data-test-id="'datatable-remote-config-button-enable-' + rowScope.$index"
                                    >
                                        {{ i18n('remote-config.enable') }}
                                    </el-dropdown-item>
                                    <el-dropdown-item
                                        v-else
                                        command="disable"
                                        :data-test-id="'datatable-remote-config-button-disable-' + rowScope.$index"
                                    >
                                        {{ i18n('remote-config.disable') }}
                                    </el-dropdown-item>
                                </template>
                                <el-dropdown-item
                                    v-if="hasUpdateRight && rowScope.row.editable"
                                    command="edit"
                                    :data-test-id="'datatable-remote-config-button-edit-' + rowScope.$index"
                                >
                                    {{ i18n('common.edit') }}
                                </el-dropdown-item>
                                <el-dropdown-item
                                    v-if="hasDeleteRight && rowScope.row.editable"
                                    command="remove"
                                    :data-test-id="'datatable-remote-config-button-delete-' + rowScope.$index"
                                >
                                    {{ i18n('common.delete') }}
                                </el-dropdown-item>
                            </cly-more-options>
                        </template>
                    </el-table-column>
                </template>
            </cly-datatable-n>
        </cly-main>
        <drawer
            :controls="drawers.parameters"
            @submit="onSubmit"
        />
    </div>
</template>
<script>
import moment from 'moment';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { i18n, i18nMixin, commonFormattersMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { confirm as CountlyConfirm, notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { validateCreate, validateUpdate, validateDelete } from '../../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { factory } from '../store/index.js';
import ParametersDrawer from './ParametersDrawer.vue';
import ConditionStats from './ConditionStats.vue';

var FEATURE_NAME = "remote_config";

export default {
    mixins: [
        mixins.hasDrawers("parameters"),
        commonFormattersMixin,
        i18nMixin
    ],
    components: {
        drawer: ParametersDrawer,
        "condition-stats": ConditionStats
    },
    computed: {
        isDrillEnabled: function() {
            return countlyGlobal.plugins.indexOf("drill") > -1;
        },
        tableRows: function() {
            return this.$store.getters["countlyRemoteConfig/parameters/all"];
        },
        isParamterLimitExceeded: function() {
            return countlyGlobal.maximum_allowed_parameters === this.$store.getters["countlyRemoteConfig/parameters/all"].length;
        },
        hasUpdateRight: function() {
            return validateUpdate(FEATURE_NAME);
        },
        hasCreateRight: function() {
            return validateCreate(FEATURE_NAME);
        },
        hasDeleteRight: function() {
            return validateDelete(FEATURE_NAME);
        },
        isTableLoading: function() {
            return this.$store.getters["countlyRemoteConfig/parameters/isTableLoading"];
        }
    },
    methods: {
        displayDescription: function(description) {
            if (description && description.length) {
                return this.unescapeHtml(description);
            }
            return '-';
        },
        getOffset: function() {
            var activeAppId = countlyCommon.ACTIVE_APP_ID;
            var timeZone = countlyGlobal.apps[activeAppId].timezone ? countlyGlobal.apps[activeAppId].timezone : 'UTC';
            var utcDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'UTC' }));
            var tzDate = new Date(new Date().toLocaleString('en-US', { timeZone: timeZone }));
            return (tzDate.getTime() - utcDate.getTime()) / 6e4;
        },
        getNumberOfConditionsText: function(conditions) {
            if (conditions.length === 1) {
                return "1 condition";
            }
            return conditions.length + " conditions";
        },
        getDate: function(ts) {
            if (!ts) {
                return "-";
            }
            var d = new Date(ts);
            return moment(d).utcOffset(this.getOffset()).format("MMM Do, YYYY");
        },
        getTime: function(ts) {
            if (!ts) {
                return "-";
            }
            var d = new Date(ts);
            return moment(d).utcOffset(this.getOffset()).format("h:mm a");
        },
        create: function() {
            this.openDrawer("parameters", factory.parameters.getEmpty());
        },
        toggleParameterState: function(rowObj, status) {
            var row = Object.assign({}, rowObj);
            var refresh = this.refresh;
            if (row.expiry_dttm < Date.now()) {
                row.expiry_dttm = null;
            }
            row.status = status;
            this.$store.dispatch("countlyRemoteConfig/parameters/update", row).then(function() {
                refresh();
            });
        },
        handleCommand: function(command, scope, row) {
            var self = this;
            switch (command) {
            case 'disable':
                self.toggleParameterState(row, "Stopped");
                break;
            case "edit":
                self.openDrawer("parameters", row);
                break;
            case 'enable':
                this.toggleParameterState(row, "Running");
                break;
            case "remove":
                CountlyConfirm(this.i18n("remote-config.confirm-parameter-delete", "<b>" + row.parameter_key + "</b>"), "popStyleGreen", function(result) {
                    if (!result) {
                        return false;
                    }
                    self.$store.dispatch("countlyRemoteConfig/parameters/remove", row).then(function() {
                        notify({
                            title: 'Success',
                            message: i18n('remote-config.parameter.delete.success'),
                            type: 'success'
                        });
                        self.onSubmit();
                    }).catch(function() {
                        notify({
                            message: i18n('remote-config.parameter.delete.fail'),
                            type: 'error',
                            width: 'large',
                        });
                    });
                }, [this.i18n("common.no-dont-delete"), this.i18n("remote-config.yes-delete-parameter")], {title: this.i18n("remote-config.delete-parameter-title"), image: "delete-email-report"});
                break;
            }
        },
        onSubmit: function() {
            this.refresh();
        },
        handleTableRowClick: function(row) {
            if (window.getSelection().toString().length === 0) {
                this.$refs.table.$refs.elTable.toggleRowExpansion(row);
            }
        },
        tableRowClassName: function() {
            return "bu-is-clickable";
        },
        formatExportFunction: function() {
            var tableData = this.$store.getters["countlyRemoteConfig/parameters/all"];
            var table = [];
            for (var i = 0; i < tableData.length; i++) {
                var item = {};
                item[i18n('remote-config.parameter').toUpperCase()] = tableData[i].parameter_key + (this.isDrillEnabled ? this.getNumberOfConditionsText(tableData[i].conditions) : "");
                item[i18n('remote-config.parameter.status').toUpperCase()] = tableData[i].status;
                item[i18n('remote-config.description').toUpperCase()] = tableData[i].description === "-" ? "" : tableData[i].description;
                item[i18n('remote-config.parameter.created').toUpperCase()] = countlyCommon.formatTimeAgoText(tableData[i].ts).text;
                item[i18n('remote-config.parameter.ab.status').toUpperCase()] = tableData[i].abStatus;
                table.push(item);
            }
            return table;
        },
        refresh: function() {
            this.$store.dispatch("countlyRemoteConfig/initialize");
        },
    },
    created: function() {
        this.$store.dispatch("countlyRemoteConfig/parameters/setTableLoading", true);
    },
};
</script>
