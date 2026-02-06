<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('sidebar.management.token-manager')"
        >
            <template v-slot:header-right>
                <el-button @click="onCreateClick" type="success" icon="el-icon-circle-plus">{{i18n('token_manager.create-new-token')}}</el-button>
            </template>
        </cly-header>
        <cly-main>
            <cly-section>
                <cly-datatable-n :rows="tableData">
                    <template v-slot="scope">
                        <el-table-column sortable="custom" prop="purpose" :label="i18n('token_manager.table.purpose')">
                            <template slot-scope="scope">
                                <p>{{scope.row.purpose}}</p>
                                <p class="text-small color-cool-gray-40">{{scope.row._id}}</p>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="status" :label="i18n('token_manager.table.status')">
                            <template slot-scope="scope">
                                <cly-status-tag :text="i18n('token_manager.table.status-' + scope.row.status)" :color="getColor(scope.row.status)">
                                </cly-status-tag>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="ends" column-key="ttlDate" :label="i18n('token_manager.table.ends')">
                            <template slot-scope="scope">
                                <p>{{scope.row.ttlDate}}</p>
                                <p class="text-small color-cool-gray-40">{{scope.row.ttlTime}}</p>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="multi" :label="i18n('token_manager.table.multi')">
                            <template slot-scope="scope">
                                {{scope.row.multi}}
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="app" :label="i18n('token_manager.table.app')">
                            <template slot-scope="scope">
                                {{scope.row.app}}
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="endpoint" :label="i18n('token_manager.table.endpoint')">
                            <template slot-scope="scope">
                                {{scope.row.endpoint}}
                            </template>
                        </el-table-column>
                        <el-table-column>
                            <template slot-scope="scope">
                                <cly-more-options @command="onDelete(scope.row)" size="small">
                                    <el-dropdown-item>{{i18n('token_manager.table.delete-token')}}</el-dropdown-item>
                                </cly-more-options>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
            <main-drawer :controls="drawers.main" @create="refresh"></main-drawer>
        </cly-main>
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';

import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyStatusTag from '../../../javascripts/components/helpers/cly-status-tag.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';

import TokenManagerDrawer from './TokenManagerDrawer.vue';

const CV = countlyVue;
const countlyTokenManager = window.countlyTokenManager;
const countlyCommon = window.countlyCommon;
const countlyGlobal = window.countlyGlobal;
const CountlyHelpers = window.CountlyHelpers;

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatatableN,
        ClyStatusTag,
        ClyMoreOptions,
        'main-drawer': TokenManagerDrawer
    },
    mixins: [
        countlyVue.mixins.hasDrawers("main"),
        countlyVue.mixins.i18n
    ],
    data: function() {
        return {
            tableData: []
        };
    },
    mounted: function() {
        var self = this;
        countlyTokenManager.initialize().then(function() {
            self.prepareTableData();
        });
    },
    methods: {
        refresh: function() {
            var self = this;
            countlyTokenManager.initialize().then(function() {
                self.prepareTableData();
            });
        },
        prepareTableData: function() {
            var tableData = countlyTokenManager.getData();
            var row;
            for (var j = 0; j < tableData.length; j++) {
                if (tableData[j]._id === countlyGlobal.auth_token) {
                    tableData.splice(j, 1);
                    j--;
                }
            }
            for (var i = 0; i < tableData.length; i++) {
                row = tableData[i];
                if (row.ttl && ((row.ends * 1000) - Date.now()) < 0) {
                    row.status = "expired";
                }
                else {
                    row.status = "active";
                }
                if (row.ttl) {
                    row.ttlDate = countlyCommon.getDate(row.ends);
                    row.ttlTime = countlyCommon.getTime(row.ends);
                }
                else {
                    row.ttlDate = CV.i18n('token_manager.table.not-expire');
                }
                if (row.app) {
                    if (row.app.length === 0) {
                        row.app = CV.i18n('token_manager.table.all-apps');
                    }
                    else {
                        row.app = CountlyHelpers.appIdsToNames(row.app);
                    }
                }
                else {
                    row.app = CV.i18n('token_manager.table.all-apps');
                }
                if (row.purpose && row.purpose !== "") {
                    row.purpose = row.purpose + "";
                    row.purpose = row.purpose[0].toUpperCase() + row.purpose.substring(1);
                }
                if (Array.isArray(row.endpoint)) {
                    var lines = [];
                    for (var p = 0; p < row.endpoint.length; p++) {
                        if (typeof row.endpoint[p] === "string") {
                            lines.push(row.endpoint[p]);
                        }
                        else {
                            if (row.endpoint[p].endpoint) {
                                var params = [];
                                var have_params = false;
                                for (var k in row.endpoint[p].params) {
                                    params.push(k + ": " + row.endpoint[p].params[k]);
                                    have_params = true;
                                }
                                if (have_params) {
                                    lines.push(row.endpoint[p].endpoint + " (" + params.join(",") + ")");
                                }
                                else {
                                    lines.push(row.endpoint[p].endpoint);
                                }
                            }
                            else {
                                lines.push(row.endpoint[p]);
                            }
                        }
                    }
                    row.endpoint = lines.join(", ");
                }
            }
            this.tableData = tableData;
        },
        getColor: function(status) {
            if (status === "active") {
                return "green";
            }
            else if (status === "expired") {
                return "red";
            }
        },
        onCreateClick: function() {
            this.openDrawer("main", {
                description: "", checkboxMultipleTimes: false, endpoints: [{parameters: [{}]}], selectApps: []
            });
        },
        onDelete: function(row) {
            var self = this;
            CountlyHelpers.confirm(CV.i18n("token_manager.delete-token-confirm"), "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }
                countlyTokenManager.deleteToken(row._id, function(err) {
                    if (err) {
                        CountlyHelpers.alert(CV.i18n("token_manager.delete-error"), "red");
                    }
                    self.refresh(true);
                });
            }, [CV.i18n("common.no-dont-delete"), CV.i18n("token_manager.yes-delete-token")], {title: CV.i18n("token_manager.delete-token-confirm-title"), image: "delete-token"});
        },
    }
};
</script>
