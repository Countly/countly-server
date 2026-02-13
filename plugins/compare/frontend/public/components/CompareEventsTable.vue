<template>
    <div>
        <cly-datatable-n
            test-id="compare-events"
            ref="compareEvents"
            :force-loading="isTableLoading"
            :rows="eventsTableRows"
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
                    width="55"
                >
                </el-table-column>
                <el-table-column
                    sortable="true"
                    prop="name"
                    :label="i18n('compare.events.event')"
                >
                    <template v-slot="rowScope">
                        <div
                            class="has-ellipsis"
                            :data-test-id="'datatable-compare-events-name-' + rowScope.$index"
                        >
                            {{rowScope.row.name}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    sortable="true"
                    prop="c"
                    :label="i18n('compare.events.count')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-events-count-' + rowScope.$index">
                            {{rowScope.row.c}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    sortable="true"
                    prop="s"
                    :label="i18n('compare.events.sum')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-events-sum-' + rowScope.$index">
                            {{rowScope.row.s}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    sortable="true"
                    prop="dur"
                    :label="i18n('compare.events.duration')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-events-duration-' + rowScope.$index">
                            {{formatDuration(rowScope.row.dur)}}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    sortable="true"
                    prop="avgDur"
                    :label="i18n('compare.events.avg-duration')"
                >
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-compare-events-avg-duration-' + rowScope.$index">
                            {{formatDuration(rowScope.row.avgDur)}}
                        </div>
                    </template>
                </el-table-column>
            </template>
        </cly-datatable-n>
    </div>
</template>

<script>
import countlyVue from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    mixins: [countlyVue.mixins.i18n],
    components: {
        ClyDatatableN,
    },
    data: function() {
        return {
            scoreTableExportSettings: {
                title: "CompareEvents",
                timeDependent: true,
            }
        };
    },
    updated: function() {
        this.$refs.compareEvents.$refs.elTable.clearSelection();
        var self = this;
        this.$store.getters["countlyCompareEvents/tableRows"]
            .map(function(row) {
                if (row.checked) {
                    self.$refs.compareEvents.$refs.elTable.toggleRowSelection(row, true);
                }
                else {
                    self.$refs.compareEvents.$refs.elTable.toggleRowSelection(row, false);
                }
            });
    },
    computed: {
        eventsTableRows: function() {
            return this.$store.getters["countlyCompareEvents/tableRows"];
        },
        groupData: function() {
            return this.$store.getters["countlyCompareEvents/groupData"];
        },
        isTableLoading: function() {
            return this.$store.getters["countlyCompareEvents/isTableLoading"];
        },
    },
    methods: {
        handleCurrentChange: function(selection) {
            var selectedEvents = [];
            selection.forEach(function(item) {
                selectedEvents.push(item.id);
            });
            this.$store.dispatch('countlyCompareEvents/updateTableStateMap', selection);
            this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
            this.$store.dispatch('countlyCompareEvents/fetchLegendData', selectedEvents);
        },
        handleAllChange: function(selection) {
            var selectedEvents = [];
            selection.forEach(function(item) {
                selectedEvents.push(item.id);
            });
            this.$store.dispatch('countlyCompareEvents/updateTableStateMap', selection);
            this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
            this.$store.dispatch('countlyCompareEvents/fetchLegendData', selectedEvents);
        },
        formatDuration: function(value) {
            return countlyCommon.formatSecond(value);
        }
    },
};
</script>
