<template>
<cly-section>
    <cly-datatable-n test-id="density-versions" :rows="versionDetail" :resizable="true" :force-loading="isLoading">
        <template v-slot="scope">
            <el-table-column sortable="custom" prop="density" :label="i18n('density.table-version')">
                <template v-slot="rowScope">
                    <div :data-test-id="'datatable-density-versions-version-' + rowScope.$index">
                        {{ rowScope.row.density }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column sortable="custom" prop="t" :formatter="numberFormatter" :label="i18n('common.table.total-sessions')">
                <template v-slot="rowScope">
                    <div :data-test-id="'datatable-density-versions-total-sessions-' + rowScope.$index">
                        {{ rowScope.row.t }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column sortable="custom" prop="u" :formatter="numberFormatter" :label="i18n('common.table.total-users')">
                <template v-slot="rowScope">
                    <div :data-test-id="'datatable-density-versions-total-users-' + rowScope.$index">
                        {{ rowScope.row.u }}
                    </div>
                </template>
            </el-table-column>
            <el-table-column sortable="custom" prop="n" :formatter="numberFormatter" :label="i18n('common.table.new-users')">
                <template v-slot="rowScope">
                    <div :data-test-id="'datatable-density-versions-new-users-' + rowScope.$index">
                        {{ rowScope.row.n }}
                    </div>
                </template>
            </el-table-column>
        </template>
        <template v-slot:header-left>
            <el-select test-id="density" v-model="selectedDensity" >
                <el-option :key="item.value" :value="item.value" :label="item.name" v-for="item in versions"></el-option>
            </el-select>
        </template>
    </cly-datatable-n>
</cly-section>
</template>

<script>
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClySection,
        ClyDatatableN
    },
    mixins: [i18nMixin],
    data: function() {
        return {
            versions: [],
            versionDetail: []
        };
    },
    computed: {
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.densityLoading;
        },
        appDensity: function() {
            return this.$store.state.countlyDevicesAndTypes.appDensity;
        },
        selectedDensity: {
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDensity', value);
            },
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedDensity;
            }
        }
    },
    watch: {
        selectedDensity: function(newValue) {
            this.calculateVersions(newValue);
        },
        versions: function() {
            this.calculateVersionsDetail();
        }
    },
    methods: {
        calculateVersions: function(newValue) {
            if (newValue) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDensity', newValue);
            }
            else {
                this.selectedDensity = this.appDensity.versions[0].label;
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDensity', this.selectedDensity);
            }

            var tempVersions = [];
            for (var k = 0; k < this.appDensity.versions.length; k++) {
                tempVersions.push({"value": this.appDensity.versions[k].label, "name": this.appDensity.versions[k].label});
            }

            this.versions = tempVersions;
        },
        calculateVersionsDetail: function() {
            var versionDetail = [];

            for (var k = 0; k < this.appDensity.versions.length; k++) {
                if (this.appDensity.versions[k].label === this.selectedDensity) {
                    versionDetail = this.appDensity.versions[k].data || [];
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
