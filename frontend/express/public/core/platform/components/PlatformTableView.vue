<template>
    <cly-section>
        <cly-datatable-n test-id="platforms" :rows="appPlatformRows" :resizable="true" :force-loading="isLoading">
            <template v-slot="scope">
                <el-table-column sortable="custom" prop="origos_" :label="i18n('platforms.title')">
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-platforms-platforms-' + rowScope.$index">
                            {{ rowScope.row.origos_ }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="t" :formatter="numberFormatter" :label="i18n('common.table.total-sessions')">
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-platforms-total-sessions-' + rowScope.$index">
                            {{ rowScope.row.t }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="u" :formatter="numberFormatter" :label="i18n('common.table.total-users')">
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-platforms-total-users-' + rowScope.$index">
                            {{ rowScope.row.u }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="n" :formatter="numberFormatter" :label="i18n('common.table.new-users')">
                    <template v-slot="rowScope">
                        <div :data-test-id="'datatable-platforms-new-users-' + rowScope.$index">
                            {{ rowScope.row.n }}
                        </div>
                    </template>
                </el-table-column>
            </template>
        </cly-datatable-n>
    </cly-section>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';

export default {
    mixins: [countlyVue.mixins.i18n],
    computed: {
        appPlatform: function() {
            return this.$store.state.countlyDevicesAndTypes.appPlatform;
        },
        appPlatformRows: function() {
            return this.appPlatform.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.platformLoading;
        }
    },
    methods: {
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    }
};
</script>
