<template>
    <div>
        <cly-datatable-n
            test-id="compare-apps"
            ref="compareApps"
            :force-loading="isTableLoading"
            :rows="appsTableRows"
            @select="handleCurrentChange"
            :keyFn="function(row) {return row.id}"
            @select-all="handleAllChange"
        >
            <template v-slot:header-left="selectScope">
            </template>
            <template v-slot="scope">
                <el-table-column
                    fixed="left"
                    type="selection"
                    :reserve-selection="true"
                >
                </el-table-column>
                <el-table-column
                    min-width="240"
                    fixed
                    sortable="true"
                    prop="name"
                    :label="i18n('compare.apps.table.name')"
                >
                    <template v-slot="rowScope">
                        <div
                            class="has-ellipsis"
                            :data-test-id="'datatable-compare-apps-name-' + rowScope.$index"
                        >
                            {{rowScope.row.name}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    min-width="160"
                    sortable="true"
                    prop="totalSessions"
                    :label="i18n('compare.apps.table.total.sessions')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-apps-total-sessions-' + rowScope.$index">
                            {{rowScope.row.totalSessions}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    min-width="200"
                    sortable="true"
                    prop="totalUsers"
                    :label="i18n('compare.apps.table.total.users')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-apps-total-users-' + rowScope.$index">
                            {{rowScope.row.totalUsers}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    min-width="200"
                    sortable="true"
                    prop="newUsers"
                    :label="i18n('compare.apps.table.new.users')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-apps-new-users-' + rowScope.$index">
                            {{rowScope.row.newUsers}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    min-width="130"
                    sortable="true"
                    prop="timeSpent"
                    :label="i18n('compare.apps.table.time.spent')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-apps-time-spent-' + rowScope.$index">
                            {{rowScope.row.timeSpent}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    min-width="210"
                    sortable="true"
                    prop="avgSessionDuration"
                    :label="i18n('compare.apps.table.avg.session.duration')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-apps-session-duration-' + rowScope.$index">
                            {{rowScope.row.avgSessionDuration}}
                        </div>
                    </template>
                </el-table-column>
            </template>
        </cly-datatable-n>
    </div>
</template>

<script>
import countlyVue from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    mixins: [countlyVue.mixins.i18n],
    components: {
        ClyDatatableN,
    },
    updated: function() {
        this.$refs.compareApps.$refs.elTable.clearSelection();
        var self = this;
        this.$store.getters["countlyCompareApps/tableRows"]
            .map(function(row) {
                if (row.checked) {
                    self.$refs.compareApps.$refs.elTable.toggleRowSelection(row, true);
                }
                else {
                    self.$refs.compareApps.$refs.elTable.toggleRowSelection(row, false);
                }
            });
    },
    computed: {
        appsTableRows: function() {
            return this.$store.getters["countlyCompareApps/tableRows"];
        },
        isTableLoading: function() {
            return this.$store.getters["countlyCompareApps/isTableLoading"];
        }
    },
    methods: {
        handleCurrentChange: function(selection) {
            var selectedApps = [];
            selection.forEach(function(item) {
                selectedApps.push(item.id);
            });
            this.$store.dispatch('countlyCompareApps/updateTableStateMap', selection);
            this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
            this.$store.dispatch('countlyCompareApps/fetchLegendData', selectedApps);
        },
        handleAllChange: function(selection) {
            var selectedApps = [];
            selection.forEach(function(item) {
                selectedApps.push(item.id);
            });
            this.$store.dispatch('countlyCompareApps/updateTableStateMap', selection);
            this.$store.dispatch('countlyCompareApps/fetchLineChartData', selectedApps);
            this.$store.dispatch('countlyCompareApps/fetchLegendData', selectedApps);
        }
    },
};
</script>
