<template>
<cly-section>
    <cly-datatable-n test-id="densities" :rows="appDensityRows" :resizable="true" v-loading="isLoading" :force-loading="isLoading">
        <template v-slot="scope">
            <el-table-column sortable="custom" prop="density" :label="i18n('density.table.density')">
                <template v-slot="rowScope">
                    <div :data-test-id="'datatable-densities-density-' + rowScope.$index">
                        {{ rowScope.row.density }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column sortable="custom" prop="t" :formatter="numberFormatter" :label="i18n('common.table.total-sessions')">
                <template v-slot="rowScope">
                    <div :data-test-id="'datatable-densities-total-sessions-' + rowScope.$index">
                        {{ rowScope.row.t }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column sortable="custom" prop="u" :formatter="numberFormatter" :label="i18n('common.table.total-users')">
                <template v-slot="rowScope">
                    <div :data-test-id="'datatable-densities-total-users-' + rowScope.$index">
                        {{ rowScope.row.u }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column sortable="custom" prop="n" :formatter="numberFormatter" :label="i18n('common.table.new-users')">
                <template v-slot="rowScope">
                    <div :data-test-id="'datatable-densities-new-users-' + rowScope.$index">
                        {{ rowScope.row.n }}
                    </div>
                </template>
            </el-table-column>
        </template>
    </cly-datatable-n>
</cly-section>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

export default {
    mixins: [i18nMixin],
    computed: {
        appDensity: function() {
            return this.$store.state.countlyDevicesAndTypes.appDensity;
        },
        appDensityRows: function() {
            return this.appDensity.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.densityLoading;
        }
    },
    methods: {
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    }
};
</script>
