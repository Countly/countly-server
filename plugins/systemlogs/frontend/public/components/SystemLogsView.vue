<template>
    <div>
        <cly-header :title="i18n('systemlogs.title')">
            <template
                v-if="back"
                v-slot:header-top
            >
                <cly-back-link
                    :title="i18n('plugins.back')"
                    @click="goBack"
                />
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="bu-mb-4" />
            <cly-section
                class="bu-mt-4"
                data-test-id="table-audit-logs"
            >
                <cly-datatable-n
                    v-if="remoteTableDataSource"
                    test-id="datatable-audit-logs"
                    :data-source="remoteTableDataSource"
                    :export-api="getExportAPI"
                    :default-sort="{prop: 'ts', order: 'descending'}"
                    ref="table"
                    :row-class-name="tableRowClassName"
                    @row-click="handleTableRowClick"
                >
                    <template v-slot="scope">
                        <el-table-column type="expand">
                            <template slot-scope="rowScope">
                                <div :data-test-id="'datatable-audit-logs-expand-row-' + rowScope.$index">
                                    <system-logs-expanded
                                        v-if="detailData[rowScope.row._id]"
                                        :row="detailData[rowScope.row._id]"
                                    />
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="ts"
                            :label="i18n('systemlogs.timestamp')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-audit-logs-time-' + scope.$index">
                                    {{ scope.row.displayTs }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="u"
                            :label="i18n('systemlogs.user')"
                        >
                            <template slot-scope="scope">
                                <a
                                    :href="scope.row.href"
                                    :title="scope.row.u"
                                    :data-test-id="'datatable-audit-logs-user-' + scope.$index"
                                >{{ scope.row.u }}</a>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="ip"
                            :label="i18n('systemlogs.ip-address')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-audit-logs-ip-' + scope.$index">
                                    {{ scope.row.ip }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column :label="i18n('systemlogs.action')">
                            <template slot-scope="scope">
                                <p :data-test-id="'datatable-audit-logs-action-action-name-' + scope.$index">{{ scope.row.actionName }}</p>
                                <p
                                    v-if="scope.row.app_name"
                                    :title="scope.row.i.app_id"
                                    :data-test-id="'datatable-audit-logs-action-app-name-' + scope.$index"
                                >{{ scope.row.app_name }}</p>
                                <p
                                    v-if="scope.row.user_name"
                                    :title="scope.row.i.user_id"
                                    :data-test-id="'datatable-audit-logs-action-user-name-' + scope.$index"
                                >{{ scope.row.user_name }}</p>
                                <p
                                    v-if="scope.row.campaign_id"
                                    :title="scope.row.i.campaign_id"
                                    :data-test-id="'datatable-audit-logs-action-campaign-id-' + scope.$index"
                                >{{ scope.row.campaign_id }}</p>
                                <p
                                    v-if="scope.row.crash_id"
                                    :title="scope.row.i.crash_id"
                                    :data-test-id="'datatable-audit-logs-action-crash-id-' + scope.$index"
                                >{{ scope.row.crash_id }}</p>
                                <p
                                    v-if="scope.row.appuser_id"
                                    :title="scope.row.i.appuser_id"
                                    :data-test-id="'datatable-audit-logs-action-appuser-id-' + scope.$index"
                                >{{ scope.row.appuser_id }}</p>
                                <p
                                    v-if="scope.row.name"
                                    :title="scope.row.name"
                                    :data-test-id="'datatable-audit-logs-action-id-' + scope.$index"
                                >{{ scope.row.name }}</p>
                            </template>
                        </el-table-column>
                    </template>
                    <template v-slot:header-left>
                        <cly-select-x
                            test-id="action-select"
                            :search-placeholder="i18n('common.search')"
                            placeholder=""
                            v-model="selectAction"
                            :options="allActions"
                            @change="changeAction"
                        />
                        <cly-select-x
                            test-id="user-select"
                            :search-placeholder="i18n('common.search')"
                            placeholder=""
                            v-model="selectUser"
                            :options="allUsers"
                            class="bu-ml-4"
                            @change="changeUser"
                        />
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>
<script>
import jQuery from 'jquery';
import moment from 'moment';
import { i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { ServerDataTable, getLocalStore, getServerDataSource } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import SystemLogsExpanded from './SystemLogsExpanded.vue';
import countlySystemLogs from '../store/index.js';

export default {
    components: {
        SystemLogsExpanded
    },
    mixins: [autoRefreshMixin, i18nMixin],
    props: {
        query: {
            default: function() {
                return {};
            }
        }
    },
    data: function() {

        return {
            loaded: true,
            parsedQuery: {},
            selectAction: "all",
            selectUser: "all",
            detailData: {},
            back: false,
            tableStore: null,
            allActions: [{"label": jQuery.i18n.map["systemlogs.all-actions"], value: "all"}],
            allUsers: [{"label": jQuery.i18n.map["systemlogs.all-users"], value: "all"}],
            remoteTableDataSource: null,
            dataSourceReady: false,
        };
    },
    watch: {
        query: {
            handler: function(newQuery) {
                if (typeof newQuery === 'object') {
                    this.parsedQuery = {};
                }
                else if (newQuery && newQuery.indexOf('/') > -1) {
                    var parts = newQuery.split('/');
                    if (parts[0] === "filter") {
                        this.back = true;
                    }
                    try {
                        this.parsedQuery = JSON.parse(parts[1]);
                    }
                    catch (error) {
                        this.parsedQuery = {};
                    }
                    this.selectAction = this.parsedQuery.a || "all";
                    this.selectUser = this.parsedQuery.user_id || "all";
                }
            },
            immediate: true
        }
    },
    beforeCreate: function() {
        var self = this;
        return countlySystemLogs.initialize()
            .then(function() {
                var meta = countlySystemLogs.getMetaData();
                if (meta.action) {
                    for (var i = 0; i < meta.action.length; i++) {
                        self.allActions.push({label: jQuery.i18n.map["systemlogs.action." + meta.action[i]] || meta.action[i], value: meta.action[i]});
                    }
                }
                if (meta.users) {
                    for (var j = 0; j < meta.users.length; j++) {
                        self.allUsers.push({label: meta.users[j].full_name || meta.users[j].email, value: meta.users[j]._id});
                    }
                }
                self.allUsers = self.sortProperties(self.allUsers);
                self.allActions = self.sortProperties(self.allActions);
            });
    },
    mounted() {
        this.prepareDataSource();
    },
    methods: {
        prepareDataSource: async function() {
            const self = this;
            const plugins = countlyGlobal.plugins ?? [];
            const [countlyAttribution, countlyCrashes] = await Promise.all([
                plugins.includes("attribution")
                    ? import('../../../../attribution/frontend/public/store/index.js')
                        .then((module) => module.default)
                        .catch(() => null)
                    : Promise.resolve(null),
                plugins.includes("crashes")
                    ? import('../../../../crashes/frontend/public/store/index.js')
                        .then((module) => module.default)
                        .catch(() => null)
                    : Promise.resolve(null),
            ]);

            this.tableStore = getLocalStore(ServerDataTable("systemLogsTable", {
                columns: ['_id', "ts", "u", "ip"],
                onRequest: function() {
                    self.loaded = false;
                    return {
                        type: "GET",
                        url: countlyCommon.API_URL + "/o",
                        data: {
                            app_id: countlyCommon.ACTIVE_APP_ID,
                            method: 'systemlogs',
                            period: countlyCommon.getPeriodForAjax(),
                            query: JSON.stringify(self.parsedQuery)
                        }
                    };
                },
                onReady: function(context, rows) {
                    self.loaded = true;
                    var row;
                    for (var i = 0; i < rows.length; i++) {
                        row = rows[i];
                        row.actionName = jQuery.i18n.map["systemlogs.action." + row.a] || row.a;
                        self.detailData[row._id] = row;
                        row.displayTs = moment(new Date(row.ts * 1000)).format("ddd, D MMM YYYY HH:mm:ss");
                        row.href = row.user_id ? "#/manage/users/" + row.user_id : "";
                        if (typeof row.i === "object") {
                            if (typeof row.i.app_id !== "undefined") {
                                if (typeof countlyGlobal.apps[row.i.app_id] !== "undefined") {
                                    row.app_name = jQuery.i18n.map["systemlogs.for-app"] + ": " + countlyGlobal.apps[row.i.app_id].name;
                                }
                                else {
                                    row.app_name = jQuery.i18n.map["systemlogs.for-app"] + ": " + row.i.app_id;
                                }
                            }
                            if (typeof row.i.user_id !== "undefined") {
                                row.user_name = (self.allUsers[row.i.user_id]) ? jQuery.i18n.map["systemlogs.for-user"] + ": " + self.allUsers[row.i.user_id] : jQuery.i18n.map["systemlogs.for-user"] + ": " + row.i.user_id;
                            }
                            if (typeof row.i.campaign_id !== "undefined" && countlyAttribution) {
                                row.campaign_id = jQuery.i18n.map["systemlogs.for-campaign"] + ": " + countlyAttribution.getCampaignName(row.i.campaign_id);
                            }
                            if (typeof row.i.crash_id !== "undefined" && countlyCrashes) {
                                row.crash_id = jQuery.i18n.map["systemlogs.for-crash"] + ": " + countlyCrashes.getCrashName(row.i.crash_id);
                            }
                            if (typeof row.i.appuser_id !== "undefined") {
                                row.appuser_id = jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.appuser_id;
                            }
                            if (typeof row.i._id !== "undefined") {
                                row.name = jQuery.i18n.map["systemlogs.for-id"] + ": " + row.i._id;
                                if (row.i.name) {
                                    row.name += " (" + row.i.name + ")";
                                }
                            }
                        }
                    }
                    return rows;
                }
            }));
            this.remoteTableDataSource = getServerDataSource(this.tableStore, "systemLogsTable")
        },
        refresh: function(force) {
            if (this.loaded || force) {
                this.loaded = false;
                this.tableStore.dispatch("fetchSystemLogsTable", {_silent: !force});
            }
        },
        dateChange: function() {
            this.refresh(true);
        },
        goBack: function() {
            app.back();
        },
        changeAction: function(value) {
            if (value !== "all") {
                this.parsedQuery.a = value;
            }
            else {
                delete this.parsedQuery.a;
            }
            app.navigate("#/manage/logs/systemlogs/query/" + JSON.stringify(this.parsedQuery));
            this.refresh(true);
        },
        changeUser: function(value) {
            if (value !== "all") {
                this.parsedQuery.user_id = value;
            }
            else {
                delete this.parsedQuery.user_id;
            }
            app.navigate("#/manage/logs/systemlogs/query/" + JSON.stringify(this.parsedQuery));
            this.refresh(true);
        },
        getExportAPI: function() {
            var query, requestPath, apiQueryData;
            query = this.parsedQuery;
            requestPath = '/o?api_key=' + countlyGlobal.member.api_key +
                "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=systemlogs&iDisplayStart=0&export=true" +
                "&query=" + encodeURIComponent(JSON.stringify(query)) +
                "&period=" + countlyCommon.getPeriodForAjax();
            apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "Auditlogs_on_" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData']
            };
            return apiQueryData;
        },
        sortProperties: function(arr) {
            arr.sort(function(a, b) {
                if (a.value === "all") {
                    return -1;
                }
                if (b.value === "all") {
                    return 1;
                }
                var x = a.label.toLowerCase(),
                    y = b.label.toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            });
            return arr;
        },
        handleTableRowClick: function(row) {
            if (window.getSelection().toString().length === 0) {
                this.$refs.table.$refs.elTable.toggleRowExpansion(row);
            }
        },
        tableRowClassName: function() {
            return 'bu-is-clickable';
        }
    }
};
</script>
