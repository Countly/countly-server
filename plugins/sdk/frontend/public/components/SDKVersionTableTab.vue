<template>
    <cly-section>
        <cly-datatable-n test-id="datatable-sdk-versions" :rows="versionDetail" :resizable="true" :force-loading="isLoading">
            <template v-slot="scope">
                <el-table-column sortable="custom" prop="sdk_version" :label="i18n('platforms.table.platform-version')">
                    <template v-slot="scope">
                        <div :data-test-id="'datatable-sdks-sdk-versions-platform-version-' + scope.$index">
                            {{ scope.row.sdk_version }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="t" :formatter="numberFormatter" :label="i18n('common.table.total-sessions')">
                    <template v-slot="scope">
                        <div :data-test-id="'datatable-sdk-versions-total-sessions-' + scope.$index">
                            {{ scope.row.t }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="u" :formatter="numberFormatter" :label="i18n('common.table.total-users')">
                    <template v-slot="scope">
                        <div :data-test-id="'datatable-sdk-versions-total-users-' + scope.$index">
                            {{ scope.row.u }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column sortable="custom" prop="n" :formatter="numberFormatter" :label="i18n('common.table.new-users')">
                    <template v-slot="scope">
                        <div :data-test-id="'datatable-sdk-versions-new-users-' + scope.$index">
                            {{ scope.row.n }}
                        </div>
                    </template>
                </el-table-column>
            </template>
            <template v-slot:header-left>
                <el-select test-id="sdk-version" v-model="selectedSDK">
                    <el-option :key="item.value" :value="item.value" :label="item.name" v-for="item in versions" />
                </el-select>
            </template>
        </cly-datatable-n>
    </cly-section>
</template>
<script>
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    data: function() {
        return {
            versions: [],
            versionDetail: []
        };
    },
    computed: {
        isLoading: function() {
            return this.$store.state.countlySDK.stats.isLoading;
        },
        sdk: function() {
            return this.$store.state.countlySDK.stats.sdk;
        },
        selectedSDK: {
            set: function(value) {
                this.$store.dispatch('countlySDK/onSetSelectedSDK', value);
            },
            get: function() {
                return this.$store.state.countlySDK.stats.selectedSDK;
            }
        }
    },
    watch: {
        selectedSDK: function(newValue) {
            this.calculateVersions(newValue);
        },
        versions: function() {
            this.calculateVersionsDetail();
        }
    },
    methods: {
        calculateVersions: function(newValue) {
            if (newValue) {
                this.$store.dispatch('countlySDK/onSetSelectedSDK', newValue);
            }
            else {
                this.selectedSDK = this.sdk.versions[0].label;
                this.$store.dispatch('countlySDK/onSetSelectedSDK', this.selectedSDK);
            }
            var tempVersions = [];
            for (var k = 0; k < this.sdk.versions.length; k++) {
                tempVersions.push({"value": this.sdk.versions[k].label, "name": this.sdk.versions[k].label});
            }
            this.versions = tempVersions;
        },
        calculateVersionsDetail: function() {
            var versionDetail = [];
            for (var k = 0; k < this.sdk.versions.length; k++) {
                if (this.sdk.versions[k].label === this.selectedSDK) {
                    versionDetail = this.sdk.versions[k].data || [];
                }
            }
            this.versionDetail = versionDetail;
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    mounted: function() {
        this.calculateVersions();
        this.calculateVersionsDetail();
    }
};
</script>
