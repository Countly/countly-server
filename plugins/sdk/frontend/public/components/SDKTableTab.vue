<template>
    <cly-section>
        <cly-datatable-n test-id="datatable-sdks" :rows="sdkRows" :resizable="true" :force-loading="isLoading">
            <template v-slot="scope">
                <el-table-column sortable="custom" prop="sdks" label="SDK">
                    <template v-slot="scope">
                        <div :data-test-id="'datatable-sdks-sdk-' + scope.$index">
                            {{ scope.row.sdks }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="t" :formatter="numberFormatter" :label="i18n('common.table.total-sessions')">
                    <template v-slot="scope">
                        <div :data-test-id="'datatable-sdks-total-sessions-' + scope.$index">
                            {{ scope.row.t }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="u" :formatter="numberFormatter" :label="i18n('common.table.total-users')">
                    <template v-slot="scope">
                        <div :data-test-id="'datatable-sdks-total-users-' + scope.$index">
                            {{ scope.row.u }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="n" :formatter="numberFormatter" :label="i18n('common.table.new-users')">
                    <template v-slot="scope">
                        <div :data-test-id="'datatable-sdks-new-users-' + scope.$index">
                            {{ scope.row.n }}
                        </div>
                    </template>
                </el-table-column>
            </template>
        </cly-datatable-n>
    </cly-section>
</template>
<script>
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    computed: {
        sdk: function() {
            return this.$store.state.countlySDK.stats.sdk;
        },
        sdkRows: function() {
            return this.sdk.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlySDK.stats.isLoading;
        }
    },
    methods: {
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    }
};
</script>
