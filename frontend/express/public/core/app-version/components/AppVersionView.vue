<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('app-versions.title')"
            :tooltip="{description}">
            <template v-slot:header-right>
                <cly-more-options v-if="topDropdown" size="small">
                    <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{url: item.value}">{{item.label}}</el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="app-version-date-picker-container"></cly-date-picker-g>
            <div class="bu-columns bu-is-gapless bu-mt-2">
                <h4 data-test-id="app-versions-for-label">{{i18n('app-versions.versions-for')}} </h4>
                <div class="selector_wrapper">
                    <el-select test-id="app-versions-for" v-model="selectedProperty" :arrow="false" :adaptiveLength="true">
                        <el-option :test-id="item.value" :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseProperties"></el-option>
                    </el-select>
                </div>
                <h4 data-test-id="as-label">&nbsp;&nbsp;{{i18n('app-versions.as')}} </h4>
                <div class="selector_wrapper">
                    <el-select test-id="as-value" v-model="selectedDisplay" :arrow="false" :adaptiveLength="true">
                        <el-option :test-id="item.value" :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseDisplay"></el-option>
                    </el-select>
                </div>
            </div>
            <cly-section>
                <cly-chart-bar test-id="app-versions" :valFormatter="appVersionStackedOptions.valFormatter" :option="appVersionStackedOptions" :patch-x-axis="false" :no-hourly="true" v-loading="isLoading" :force-loading="isLoading" category="user-analytics"> </cly-chart-bar>
            </cly-section>
            <cly-section>
                <cly-datatable-n test-id="app-versions" :rows="appVersionRows" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column sortable="custom" prop="app_versions" :label="i18n('app-versions.table.app-version')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-app-versions-app-version-' + rowScope.$index">
                                    {{ rowScope.row.app_versions }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="t" :formatter="numberFormatter" :label="i18n('common.table.total-sessions')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-app-versions-total-sessions-' + rowScope.$index">
                                    {{ rowScope.row.t }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="u" :formatter="numberFormatter" :label="i18n('common.table.total-users')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-app-versions-total-users-' + rowScope.$index">
                                    {{ rowScope.row.u }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="n" :formatter="numberFormatter" :label="i18n('common.table.new-users')">
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-app-versions-new-users-' + rowScope.$index">
                                    {{ rowScope.row.n }}
                                </div>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
import { dataMixin } from '../../../javascripts/countly/vue/container.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';
import ClyChartBar from '../../../javascripts/components/echart/cly-chart-bar.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';

const CV = countlyVue;

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatePickerG,
        ClyMoreOptions,
        ClyChartBar,
        ClyDatatableN,
    },
    mixins: [
        countlyVue.mixins.i18n,
        autoRefreshMixin,
        dataMixin({
            'externalLinks': '/analytics/versions/links'
        })
    ],
    data: function() {
        return {
            description: CV.i18n('app-versions.description'),
            barChartItemsLegends: {
                totalSessions: CV.i18n('common.table.total-sessions'),
                newUsers: CV.i18n('common.table.new-users')
            },
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchAppVersion', true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyDevicesAndTypes/fetchAppVersion', force);
        },
        dateChanged: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchAppVersion', true);
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    computed: {
        appVersion: function() {
            return this.$store.state.countlyDevicesAndTypes.appVersion;
        },
        seriesTotal: function() {
            return this.$store.state.countlyDevicesAndTypes.seriesTotal;
        },
        appVersionRows: function() {
            return this.appVersion.table;
        },
        appVersionOptions: function() {
            return this.appVersion.chart;
        },
        appVersionStackedOptions: function() {
            return {series: this.appVersion.series, xAxis: this.appVersion.xAxis, yAxis: this.appVersion.yAxis, valFormatter: this.appVersion.valFormatter};
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.versionLoading;
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        },
        chooseProperties: function() {
            return [{"value": "t", "name": CV.i18n('common.table.total-sessions')}, {"value": "u", "name": CV.i18n('common.table.total-users')}, {"value": "n", "name": CV.i18n('common.table.new-users')}];
        },
        chooseDisplay: function() {
            return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
        },
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedProperty', value);
                this.$store.dispatch('countlyDevicesAndTypes/onRecalcProp');
            },
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedProperty;
            }
        },
        selectedDisplay: {
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDisplay', value);
                this.$store.dispatch('countlyDevicesAndTypes/onRecalcProp');
            },
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedDisplay;
            }
        }
    }
};
</script>
