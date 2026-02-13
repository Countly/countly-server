<template>
<cly-section>
    <cly-datatable-n
        test-id="datatable-hooks"
        :force-loading="!initialized"
        :persist-key="tablePersistKey"
        class="cly-vue-hook-table is-clickable"
        :tracked-fields="localTableTrackedFields"
        :rows="tableRows" :resizable="false"
        :exportFormat="formatExportFunction"
        :available-dynamic-cols="tableDynamicCols">
        <template v-slot:header-left="scope">
            <div class="bu-mr-2">
                <el-radio-group :plain="true" v-model="filterStatus">
                    <el-radio-button test-id="all-hooks-radio-button" label="all">{{i18n('hooks.status-all')}}</el-radio-button>
                    <el-radio-button test-id="enabled-hooks-radio-button" label="enabled">{{i18n('hooks.status-enabled')}}</el-radio-button>
                    <el-radio-button test-id="disabled-hooks-radio-button" label="disabled">{{i18n('hooks.status-disabled')}}</el-radio-button>
                </el-radio-group>
            </div>
            <div class="hooks-table-app-selector">
                <cly-select-x
                   :placeholder="i18n('hooks.all-applications')"
                   mode="multi-check"
                   v-model="filteredApps"
                   :options="appsSelectorOption">
                </cly-select-x>
            </div>
        </template>

        <template v-slot="scope">
            <el-table-column fixed="left" width="88" label="">
                <template v-slot="rowScope">
                    <el-switch :test-id="'datatable-hooks-status-' + rowScope.$index" :value="rowScope.row.enabled"
                        class="bu-ml-4  bu-mr-2"
                        :disabled="!rowScope.row._canUpdate"
                        @input="scope.patch(rowScope.row, {enabled: !rowScope.row.enabled})">
                    </el-switch>
                </template>
            </el-table-column>

            <el-table-column fixed :label="i18n('hooks.hook-name')" sortable="true" prop="name" min-width="240" class="is-clickable">
                <template slot-scope="scope">
                    <div>
                        <div class="is-name-col bu-is-clickable" @click="onRowClick(scope.row)" :data-test-id="'datatable-hooks-hook-name-' + scope.$index">{{scope.row.name}}</div>
                        <div v-if="scope.row.description" class="is-desc-col" :data-test-id="'datatable-hooks-hook-description-' + scope.$index">{{scope.row.description}}</div>
                    </div>
                </template>
            </el-table-column>

            <el-table-column min-width="270" label="Trigger -> Actions">
            <template v-slot:header="scope">
               <span>{{i18n('hooks.trigger')}} <i class="el-icon-arrow-right el-icon-right"></i> {{ i18n('hooks.effects') }}</span>
            </template>
            <template slot-scope="scope" sortable="true">
                <div v-html="scope.row.triggerEffectColumn" :data-test-id="'datatable-hooks-trigger-action-' + scope.$index"></div>
            </template>

            </el-table-column>
            <template v-for="(col,idx) in scope.dynamicCols">
                <el-table-column
                    v-if="col.value === 'triggerCount'"
                    sortable="true" align="right" prop="triggerCount" :label="i18n('hooks.trigger-count')" min-width="155" :key="'dyn-' + idx">
                        <template slot-scope="scope">
                            <span :data-test-id="'datatable-hooks-trigger-count-' + scope.$index">{{scope.row.triggerCount}}</span>
                        </template>
                </el-table-column>
                <el-table-column
                    align="left"
                    v-if="col.value === 'lastTriggerTimestampString'"
                    sortable="true" prop="lastTriggerTimestampString" :label="i18n('hooks.trigger-last-time')" min-width="160" :key="'dyn-' + idx">
                    <template slot-scope="scope">
                        <span :data-test-id="'datatable-hooks-last-triggered-' + scope.$index">{{scope.row.lastTriggerTimestampString}}</span>
                    </template>
                </el-table-column>
            </template>


            <el-table-column :label="i18n('hooks.create-by')" prop="createdByUser" min-width="150" sortable="true">
                <template slot-scope="scope">
                    <div class="is-last-col">
                        <div>
                            <div class="is-created-by-col" :data-test-id="'datatable-hooks-created-by-' + scope.$index">
                                {{scope.row.createdByUser || "-"}}
                             </div>
                             <div class="is-created-by-desc-col" :data-test-id="'datatable-hooks-created-date-' + scope.$index">
                                 {{ scope.row.created_at_string }}
                             </div>
                        </div>
                    </div>
                </template>
            </el-table-column>
            <el-table-column type="options">
                <template v-slot="rowScope">
                    <cly-more-options :test-id="'datatable-hooks-' + rowScope.$index" v-if="rowScope.row.hover &&(rowScope.row._canUpdate || rowScope.row._canDelete)" size="small" @command="handleHookEditCommand($event,rowScope)">
                        <el-dropdown-item v-if="rowScope.row._canUpdate" icon="el-icon-document-copy" command="edit-comment">
                            {{i18n('hooks.edit')}}
                        </el-dropdown-item>
                        <el-dropdown-item v-if="rowScope.row._canDelete" icon="el-icon-delete" command="delete-comment">
                            {{i18n('hooks.delete')}}
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
</template>

<script>
import { i18n, i18nMixin, authMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { confirm as CountlyConfirm } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import hooksPlugin from '../store/index.js';
import jQuery from 'jquery';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClyDiffHelper from '../../../../../frontend/express/public/javascripts/components/helpers/cly-diff-helper.vue';

var FEATURE_NAME = "hooks";

var appsSortFunction = function(a, b) {
    const aLabel = a?.label || '';
    const bLabel = b?.label || '';
    const locale = countlyCommon.BROWSER_LANG || 'en';

    if (aLabel && bLabel) {
        return aLabel.localeCompare(bLabel, locale, { numeric: true }) || 0;
    }
    if (!aLabel && bLabel) {
        return 1;
    }
    if (aLabel && !bLabel) {
        return -1;
    }
    return 0;
};

export default {
    mixins: [
        i18nMixin,
        authMixin(FEATURE_NAME)
    ],
    components: {
        ClySection,
        ClyDatatableN,
        ClySelectX,
        ClyMoreOptions,
        ClyDiffHelper,
    },
    computed: {
        tableRows: function() {
            var rows = this.$store.getters["countlyHooks/table/all"];
            if (this.filterStatus !== "all") {
                var enabled = this.filterStatus === "enabled" ? true : false;
                rows = rows.filter(function(r) {
                    return r.enabled === enabled;
                });
            }

            if (this.filteredApps.length > 0) {
                var self = this;
                rows = rows.filter(function(r) {
                    var matched = false;
                    self.filteredApps.forEach(function(a) {
                        if (r.apps.indexOf(a) >= 0) {
                            matched = true;
                        }
                    });
                    return matched;
                });
            }
            return rows;
        },
        initialized: function() {
            var result = this.$store.getters["countlyHooks/table/getInitialized"];
            return result;
        },
    },
    data: function() {
        var appsSelectorOption = [];
        for (var id in countlyGlobal.apps) {
            appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id, image: "background-image:url(" + countlyGlobal.apps[id].image + ")"});
        }

        appsSelectorOption.sort(appsSortFunction);

        return {
            appsSelectorOption: appsSelectorOption,
            filterStatus: 'all',
            filteredApps: [],
            localTableTrackedFields: ['enabled'],
            isAdmin: countlyGlobal.member.global_admin,
            deleteElement: null,
            showDeleteDialog: false,
            deleteMessage: '',
            tableDynamicCols: [{
                value: "triggerCount",
                label: i18n('hooks.trigger-count'),
                default: true
            },
            {
                value: "lastTriggerTimestampString",
                label: i18n('hooks.trigger-last-time'),
                default: true
            }],
            tablePersistKey: "hooks_table_" + countlyCommon.ACTIVE_APP_ID,
        };
    },
    methods: {
        handleHookEditCommand: function(command, scope) {
            if (command === "edit-comment") {
                var data = Object.assign({}, scope.row);

                delete data.operation;
                delete data.triggerEffectColumn;
                delete data.triggerEffectDom;
                delete data.error_logs;
                this.$store.dispatch("countlyHooks/resetTestResult");
                this.$parent.$parent.openDrawer("home", data);
            }
            else if (command === "delete-comment") {
                var self = this;
                this.deleteElement = scope.row;
                var deleteMessage = i18n("hooks.delete-confirm", "<b>" + this.deleteElement.name + "</b>");
                CountlyConfirm(deleteMessage, "red", function(result) {
                    if (!result) {
                        return true;
                    }
                    self.$store.dispatch("countlyHooks/deleteHook", self.deleteElement._id);
                }, [jQuery.i18n.map['common.no-dont-delete'], jQuery.i18n.map['common.delete']], {title: jQuery.i18n.map['hooks.delete-confirm-title']});
            }
        },
        updateStatus: function(scope) {
            var diff = scope.diff;
            var status = {};
            diff.forEach(function(item) {
                status[item.key] = item.newValue;
            });
            var self = this;
            this.$store.dispatch("countlyHooks/table/updateStatus", status).then(function() {
                return self.$store.dispatch("countlyHooks/table/fetchAll");
            });
        },
        refresh: function() {
        },
        onRowClick: function(params) {
            app.navigate("/manage/hooks/" + params._id, true);
        },
        formatExportFunction: function() {
            var tableData = this.tableRows;
            var table = [];
            for (var i = 0; i < tableData.length; i++) {
                var item = {};
                item[i18n('hooks.hook-name').toUpperCase()] = tableData[i].name;
                item[i18n('hooks.description').toUpperCase()] = tableData[i].description;
                item[i18n('hooks.trigger-and-actions').toUpperCase()] = hooksPlugin.generateTriggerActionsTreeForExport(tableData[i]);
                item[i18n('hooks.trigger-count').toUpperCase()] = tableData[i].triggerCount;
                item[i18n('hooks.trigger-last-time').toUpperCase()] = tableData[i].lastTriggerTimestampString === "-" ? "" : tableData[i].lastTriggerTimestampString;
                item[i18n('hooks.create-by').toUpperCase()] = tableData[i].createdByUser;

                table.push(item);
            }
            return table;
        },
    }
};
</script>
