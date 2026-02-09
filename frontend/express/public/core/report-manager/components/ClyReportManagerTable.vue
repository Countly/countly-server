<template>
    <cly-datatable-n
        :data-source="remoteTableDataSource"
        :test-id="testId"
        :export-api="getExportAPI"
        :max-height="maxHeight"
        :default-sort="{prop: 'start', order: 'descending'}">
        <template v-slot:header-left>
            <cly-dropdown ref="filterDropdown" :width="300" @hide="handleReloadFilter">
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
                        ref="filterForm"
                        @submit="handleSubmitFilter"
                        class="report-manager-filter-form"
                    >
                        <template v-slot="formScope">
                            <cly-form-step id="filter-form-step">
                                <div class="bu-m-4">
                                    <div class="bu-level">
                                        <div class="bu-level-left">
                                            <div class="bu-level-item">
                                                <h4>{{i18n('report-manager.filters')}}</h4>
                                            </div>
                                        </div>
                                        <div class="bu-level-right">
                                            <div class="bu-level-item">
                                                <el-button type="text" class="cly-multi-select__reset" @click="handleResetFilter">
                                                    {{i18n('report-manager.reset-filters')}}
                                                </el-button>
                                            </div>
                                        </div>
                                    </div>
                                    <cly-form-field :label="i18n('report-manager.origin')" v-if="!fixedOrigin">
                                        <el-select v-model="formScope.editedObject.selectedOrigin" :placeholder="i18n('report-manager.select-origin')" class="select-full-width" placement="bottom-start">
                                            <el-option :key="value" v-for="(label, value) in availableOrigins" :label="label" :value="value"></el-option>
                                        </el-select>
                                    </cly-form-field>
                                    <cly-form-field :label="i18n('report-manager.status')">
                                        <el-select v-model="formScope.editedObject.selectedState" :placeholder="i18n('common.select-status')" class="select-full-width" placement="bottom-start">
                                            <el-option :key="value" v-for="(label, value) in availableStates" :label="label" :value="value"></el-option>
                                        </el-select>
                                    </cly-form-field>
                                    <cly-form-field :label="i18n('report-manager.owner')">
                                        <el-select v-model="formScope.editedObject.selectedOwner" :placeholder="i18n('common.select-owner')" class="select-full-width" placement="bottom-start">
                                            <el-option :key="value" v-for="(label, value) in availableOwners" :label="label" :value="value"></el-option>
                                        </el-select>
                                    </cly-form-field>
                                    <cly-form-field :label="i18n('report-manager.data-source')">
                                        <el-select v-model="formScope.editedObject.selectedDataSource" :placeholder="i18n('report-manager.select-data-source')" class="select-full-width" placement="bottom-start">
                                            <el-option :key="value" v-for="(label, value) in availableDataSources" :label="label" :value="value"></el-option>
                                        </el-select>
                                    </cly-form-field>
                                    <cly-form-field :label="i18n('report-manager.runtime-type')" v-if="isManual">
                                        <el-select v-model="formScope.editedObject.selectedRunTimeType" :placeholder="i18n('common.select-type')" class="select-full-width" placement="bottom-start">
                                            <el-option :key="value" v-for="(label, value) in availableRunTimeTypes" :label="label" :value="value"></el-option>
                                        </el-select>
                                    </cly-form-field>
                                    <div class="bu-has-text-right bu-pt-3">
                                        <el-button type="secondary" @click="handleCancelFilter">{{i18n('common.cancel')}}</el-button>
                                        <el-button type="success" @click="formScope.submit()">{{i18n('common.apply')}}</el-button>
                                    </div>
                                </div>
                            </cly-form-step>
                        </template>
                    </cly-form>
                </template>
            </cly-dropdown>
        </template>
        <template>
            <el-table-column :label="i18n('report-manager.name-and-desc')">
                <template v-slot="scope">
                    <unread-pin
                        auto-read
                        :task-id="scope.row._id"
                        :app-id="scope.row.app_id">
                    </unread-pin>
                    {{ scope.row.report_name || scope.row.name || "-" }}
                    <div class="report-manager-report-desc"> {{ scope.row.report_desc || "-" }}</div>
                </template>
            </el-table-column>
            <el-table-column v-if="!compact" :label="i18n('report-manager.data')">
                <template v-slot="scope">
                    {{ scope.row.name || scope.row.meta || "" }}
                </template>
            </el-table-column>
            <el-table-column width="160" :label="i18n('common.status')">
                <template v-slot="scope">
                    <div v-if="scope.row.taskgroup && scope.row.subtasks && scope.row.hasStatusDifferences">
                        <div v-for="subtask in scope.row.subtasks">
                            <cly-status-tag
                                :key="subtask._id"
                                :color="getColor(subtask.status)"
                                v-tooltip="subtask.errormsg"
                                :text="availableStates[subtask.status] || subtask.status">
                            </cly-status-tag>
                        </div>
                    </div>
                    <div v-else>
                        <cly-status-tag
                            v-tooltip="scope.row.errormsg"
                            :color="getColor(scope.row.status)"
                            :text="availableStates[scope.row.status] || scope.row.status">
                        </cly-status-tag>
                    </div>
                </template>
            </el-table-column>
            <el-table-column v-if="!fixedOrigin" width="120" :label="i18n('taskmanager.origin')">
                <template v-slot="scope">
                    <span class="status-color" style="text-transform:capitalize">{{scope.row.type}}</span>
                </template>
            </el-table-column>
            <el-table-column width="100" :label="i18n('common.type')" v-if="isManual">
                <template v-slot="scope">
                    {{scope.row.autoRefresh ? i18n("taskmanager.auto") : i18n("taskmanager.manual")}}
                </template>
            </el-table-column>
            <el-table-column width="100" :label="i18n('report-manager.period')" v-if="isManual">
                <template v-slot="scope">
                    {{scope.row.period_desc || "-"}}
                </template>
            </el-table-column>
            <el-table-column width="100" :label="i18n('report-manager.visibility')" v-if="isManual">
                <template v-slot="scope">
                    {{scope.row.global === false ? 'Private' : 'Global'}}
                </template>
            </el-table-column>
            <el-table-column width="160" prop="start" sortable="custom" :label="i18n('common.last-updated')">
                <template v-slot="scope">
                    {{ scope.row.startFormatted && scope.row.startFormatted.text }}
                </template>
            </el-table-column>
            <el-table-column width="160" :label="i18n('events.table.dur')" v-if="!isManual">
                <template v-slot="scope">
                    {{ scope.row.duration }}
                </template>
            </el-table-column>
            <el-table-column align="center" type="options">
                <template v-slot="scope">
                    <cly-more-options v-if="scope.row.hover" @command="handleCommand($event, scope.row)" placement="bottom-end">
                        <el-dropdown-item v-if="isReadyForView(scope.row) && isDownloadable(scope.row)" command="download-task">{{i18n('common.download')}}</el-dropdown-item>
                        <el-dropdown-item v-if="isReadyForView(scope.row) && !isDownloadable(scope.row)" command="view-task">{{getViewText(scope.row)}}</el-dropdown-item>
                        <el-dropdown-item v-if="isReadyForRerun(scope.row)" command="rerun-task">{{i18n('taskmanager.rerun')}}</el-dropdown-item>
                        <el-dropdown-item v-if="canDeleteReport" command="delete-task">{{i18n('common.delete')}}</el-dropdown-item>
                    </cly-more-options>
                </template>
            </el-table-column>
        </template>
    </cly-datatable-n>
</template>

<script>
import { commonFormattersMixin, i18nMixin, i18n, vuex } from '../../../javascripts/countly/vue/core.js';
import * as countlyTaskManager from '../../../javascripts/countly/countly.task.manager.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import { confirm as countlyConfirm, alert as countlyAlert } from '../../../javascripts/countly/countly.helpers.js';
import UnreadPin from './UnreadPin.vue';
import moment from 'moment';

export default {
    components: {
        "unread-pin": UnreadPin
    },
    mixins: [commonFormattersMixin, i18nMixin],
    props: {
        reportType: {
            type: String,
            default: "manual"
        },
        fixedOrigin: {
            type: String,
            default: null
        },
        compact: {
            type: Boolean,
            default: false
        },
        disableAutoNavigationToTask: {
            type: Boolean,
            default: false
        },
        maxHeight: {
            type: String,
            default: null
        },
        testId: {
            type: String,
            default: "cly-report-manager-table-default-test-id",
            required: false
        }
    },
    computed: {
        isManual: function() {
            return this.reportType === 'manual';
        },
        canDeleteReport: function() {
            return countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID];
        },
        query: function() {
            var q = {};
            if (this.fixedOrigin) {
                q.type = this.fixedOrigin;
            }
            else if (this.currentFilter.selectedOrigin && this.currentFilter.selectedOrigin !== "all") {
                q.type = this.currentFilter.selectedOrigin;
            }
            if (this.currentFilter.selectedRunTimeType && this.currentFilter.selectedRunTimeType !== "all") {
                q.autoRefresh = this.currentFilter.selectedRunTimeType === "auto-refresh";
            }
            if (this.currentFilter.selectedState && this.currentFilter.selectedState !== "all") {
                q.status = this.currentFilter.selectedState;
            }
            if (this.currentFilter.selectedOwner && this.currentFilter.selectedOwner !== "all") {
                q.creator = countlyGlobal.member._id;
            }
            return q;
        },
        remoteOpId: function() {
            return this.$store.state.countlyTaskManager.opId;
        },
        filterSummary: function() {
            let filters = [
                this.availableStates[this.currentFilter.selectedState],
                this.availableOwners[this.currentFilter.selectedOwner],
                this.availableDataSources[this.currentFilter.selectedDataSource]
            ];
            if (!this.fixedOrigin) {
                filters.splice(0, 0, this.availableOrigins[this.currentFilter.selectedOrigin]);
            }
            if (this.isManual) {
                filters.push(this.availableRunTimeTypes[this.currentFilter.selectedRunTimeType]);
            }
            return filters.join(", ");
        },
        availableDataSources: function() {
            var obj = {
                "all": i18n("report-manager.all-sources"),
                "independent": i18n("report-manager.app-independent")
            };
            if (countlyGlobal.apps && Object.keys(countlyGlobal.apps).length !== 0) {
                const globalApps = Object.values(countlyGlobal.apps)
                    .sort(function(a, b) {
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
                    });

                for (var app of globalApps) {
                    obj[app._id] = app.name;
                }
            }
            return obj;
        },
        selectedAppId: function() {
            return (this.currentFilter.selectedDataSource && ["all", "independent"].includes(this.currentFilter.selectedDataSource))
                ? countlyCommon.ACTIVE_APP_ID
                : this.currentFilter.selectedDataSource;
        },
        dataSource: function() {
            if (this.currentFilter.selectedDataSource && ["all", "independent"].includes(this.currentFilter.selectedDataSource)) {
                return this.currentFilter.selectedDataSource;
            }
        }
    },
    watch: {
        "query": function() {
            this.refresh(true);
        },
        remoteOpId: function() {
            this.refresh(true);
        }
    },
    data: function() {
        var self = this;
        var tableStore = vuex.getLocalStore(vuex.ServerDataTable("reportsTable", {
            columns: ['report_name', '_placeholder0', 'status', 'type', "_placeholder1", "_placeholder2", "_placeholder3", 'end', 'start'],
            onRequest: function() {
                var queryObject = Object.assign({}, self.query);
                if (self.isManual) {
                    queryObject.manually_create = true;
                }
                else {
                    queryObject.manually_create = {$ne: true};
                    delete queryObject.autoRefresh;
                }
                return {
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/tasks/list",
                    data: {
                        app_id: self.selectedAppId,
                        data_source: self.dataSource,
                        query: JSON.stringify(queryObject),
                    }
                };
            },
            onOverrideRequest: function(context, request) {
                self.lastRequestPayload = request.data;
            },
            onError: function(context, err) {
                throw err;
            },
            onReady: function(context, rows) {
                rows.forEach(function(row) {
                    if (row.taskgroup && row.subtasks) {
                        var stat = null;
                        for (var k in row.subtasks) {
                            if (stat && row.subtasks[k].status !== stat) {
                                row.hasStatusDifferences = true;
                            }
                            stat = row.subtasks[k].status;
                            if (row.subtasks[k].status === "errored" || row.subtasks[k].status === "running" || row.subtasks[k].status === "rerunning") {
                                row.status = row.subtasks[k].status;
                                row.start = row.subtasks[k].start || row.start;
                            }
                            if (row.end < row.subtasks[k].end) {
                                row.end = row.subtasks[k].end;
                            }
                        }
                    }
                    row.startFormatted = countlyCommon.formatTimeAgoText(row.start);
                    var time = 0;
                    if (row.status === "running" || row.status === "rerunning") {
                        time = Math.max(new Date().getTime() - row.start, 0);
                    }
                    else if (row.end && row.end > row.start) {
                        time = row.end - row.start;
                    }
                    row.duration = countlyCommon.formatTime(Math.round(time / 1000));
                });
                return rows;
            }
        }));
        return {
            tableStore: tableStore,
            remoteTableDataSource: vuex.getServerDataSource(tableStore, "reportsTable"),
            availableOrigins: {
                "all": i18n("report-manager.all-origins"),
                "funnels": i18n("sidebar.funnels") || "Funnels",
                "drill": i18n("drill.drill") || "Drill",
                "retention": i18n("retention.retention") || "Retention",
                "formulas": i18n("calculated-metrics.formulas") || "Formulas",
                "dbviewer": i18n("dbviewer.title") || "DBViewer",
                "data-manager": i18n("data-manager.plugin-title") || "Data Manager",
                "views": i18n("views.title") || "Views"
            },
            availableRunTimeTypes: {
                "all": i18n("report-manager.all-types"),
                "auto-refresh": i18n("taskmanager.auto"),
                "none-auto-refresh": i18n("taskmanager.manual")
            },
            availableStates: {
                "all": i18n("report-manager.all-statuses"),
                "running": i18n("common.running"),
                "rerunning": i18n("taskmanager.rerunning"),
                "stopped": i18n("common.stopped"),
                "completed": i18n("common.completed"),
                "errored": i18n("common.errored")
            },
            availableOwners: {
                "all": i18n("report-manager.all-owners"),
                "me": i18n("report-manager.my-reports")
            },
            currentFilter: {
                selectedOrigin: "all",
                selectedRunTimeType: "all",
                selectedState: "all",
                selectedOwner: "all",
                selectedDataSource: "all"
            },
            lastRequestPayload: {}
        };
    },
    methods: {
        refresh: function(force) {
            this.tableStore.dispatch("fetchReportsTable", {_silent: !force});
        },
        getColor: function(status) {
            if (status === "completed") {
                return "green";
            }
            if (status === "errored") {
                return "red";
            }
            return "blue";
        },
        getViewText: function(row) {
            return (row.status !== "running" && row.status !== "rerunning") ? i18n("common.view") : i18n("taskmanager.view-old");
        },
        isDownloadable: function(row) {
            return ["views", "dbviewer", "tableExport"].includes(row.type);
        },
        isReadyForView: function(row) {
            if (row.linked_to) {
                if (row.have_dashboard_widget) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                return row.view && row.hasData;
            }
        },
        isReadyForRerun: function(row) {
            return (row.type && row.type !== "profile group") && row.status !== "running" && row.status !== "rerunning" && row.request;
        },
        handleCommand: function(command, row) {
            var id = row._id,
                self = this;

            if (id) {
                if (command === "delete-task") {
                    countlyConfirm(i18n("taskmanager.confirm-delete", "<b>" + row.name + "</b>"), "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyTaskManager.del(id, function(res, error) {
                            if (res.result === "Success") {
                                self.refresh();
                            }
                            else {
                                countlyAlert(error, "red");
                            }
                        });
                    }, [i18n("common.no-dont-delete"), i18n("taskmanager.yes-delete-report")], {title: i18n("taskmanager.confirm-delete-title"), image: "delete-report"});
                }
                else if (command === "rerun-task") {
                    countlyConfirm(i18n("taskmanager.confirm-rerun"), "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        self.refresh();
                        countlyTaskManager.update(id, function(res, error) {
                            if (res.result === "Success") {
                                countlyTaskManager.monitor(id, true);
                                self.refresh();
                            }
                            else {
                                countlyAlert(error, "red");
                            }
                        });
                    }, [i18n("common.no-dont-do-that"), i18n("taskmanager.yes-rerun-task")], {title: i18n("taskmanager.confirm-rerun-title"), image: "rerunning-task"});
                }
                else if (command === "view-task") {
                    self.$emit("view-task", row);
                    if (!this.disableAutoNavigationToTask) {
                        if (row.dashboard_report || row.type === "profile group") {
                            window.location = row.view;
                        }
                        else {
                            window.location = row.view + id;
                        }
                    }
                }
                else if (command === "download-task") {
                    self.$emit("download-task", row);
                    var app_id = row.app_id && row.app_id !== "undefined" ? row.app_id : countlyCommon.ACTIVE_APP_ID;
                    var link = countlyCommon.API_PARTS.data.r + '/export/download/' + row._id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + app_id;
                    window.location = link;
                }
            }
        },
        getExportAPI: function() {
            var requestPath = '/o/tasks/list?api_key=' + countlyGlobal.member.api_key + '&iDisplayStart=0&iDisplayLength=10000',
                self = this;

            if (this.lastRequestPayload) {
                Object.keys(this.lastRequestPayload).forEach(function(name) {
                    switch (name) {
                    case 'query':
                        requestPath += '&' + name + '=' + encodeURI(self.lastRequestPayload[name]);
                        break;
                    default:
                        requestPath += '&' + name + '=' + self.lastRequestPayload[name];
                    }
                });
            }
            var apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "Reports" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData']
            };
            return apiQueryData;
        },
        handleSubmitFilter: function(newFilter) {
            this.currentFilter = newFilter;
            this.$refs.filterDropdown.doClose();
        },
        handleReloadFilter: function() {
            //this.$refs.filterDropdown.reload();
        },
        handleResetFilter: function() {
            this.currentFilter = {
                selectedOrigin: "all",
                selectedRunTimeType: "all",
                selectedState: "all",
                selectedOwner: "all",
                selectedDataSource: "all"
            };
        },
        handleCancelFilter: function() {
            this.$refs.filterDropdown.doClose();
        }
    },
    created: function() {
        var filteredOrigins = {};
        for (var key in this.availableOrigins) {
            var isValid = countlyGlobal.plugins.includes(key) || key === "all";

            if (key === "retention" && countlyGlobal.plugins.includes("retention_segments")) {
                isValid = true;
            }

            if (isValid) {
                filteredOrigins[key] = this.availableOrigins[key];
            }
        }
        this.availableOrigins = filteredOrigins;
    }
};
</script>
