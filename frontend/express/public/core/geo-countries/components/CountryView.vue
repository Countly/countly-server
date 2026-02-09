<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('countries.title')"
            :tooltip="{description}"
        >
            <template v-slot:header-right>
                <cly-more-options v-if="topDropdown" size="small">
                    <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{url: item.value}">{{item.label}}</el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="geo-date-picker-container" ref="datePicker"></cly-date-picker-g>
            <cly-section class="geo-analytics-data geo-countries-section">
                <div class="bu-columns bu-is-gapless" style="height: 534px;">
                    <div style="width:256px;">
                        <cly-radio-block v-bind:items="chooseProperties" v-model="selectedProperty" v-loading="isLoading"></cly-radio-block>
                    </div>
                    <div class="bu-column leaflet-noclick-map" data-test-id="cly-worldmap" style="position:relative">
                        <cly-worldmap
                            v-loading="isLoading"
                            style="height: 100%;"
                            external-country=""
                            external-detail-mode="world"
                            :value-type="selectedPropertyTitle"
                            :show-detail-mode-select="false"
                            :show-navigation="false"
                            :prevent-going-to-country="true"
                            :preventLayerClick="true"
                            :countries-data="countriesData"
                            @country-click="regionClick"
                        >
                        </cly-worldmap>
                        <div style="position: absolute; top: 20px; left:20px; z-index: 400;">
                            <a ref="toCityViewLink" class="cly-vue-button button-light-skin ToLink" :href="buttonLink">{{buttonText}}</a>
                        </div>
                    </div>
                </div>
            </cly-section>
            <cly-section>
                <cly-datatable-n test-id="countries" :rows="countryTable" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column sortable="custom" prop="countryTranslated" :label="i18n('countries.table.country')">
                            <template slot-scope="scope">
                                <div class="bu-level-left">
                                    <div class="bu-level-item slipping-away-users-table-data-item">
                                        <img :src='scope.row.flag' :data-test-id="'datatable-countries-country-flag-' + scope.$index" />
                                        <span class="bu-pl-4" :data-test-id="'datatable-countries-country-name-' + scope.$index">{{scope.row.countryTranslated}}</span>
                                    </div>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="t" :label="i18n('common.table.total-sessions')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-countries-total-sessions-' + scope.$index">
                                    {{formatNumber(scope.row.t)}}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="u" :label="i18n('common.table.total-users')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-countries-total-users-' + scope.$index">
                                    {{formatNumber(scope.row.u)}}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="n" :label="i18n('common.table.new-users')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-countries-new-users-' + scope.$index">
                                    {{formatNumber(scope.row.n)}}
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
import { autoRefreshMixin, i18n, commonFormattersMixin, i18nMixin } from '../../../javascripts/countly/vue/core.js';
import { dataMixin } from '../../../javascripts/countly/vue/container.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyLocation from '../../../javascripts/countly/countly.location.js';

import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';
import ClyRadioBlock from '../../../javascripts/components/input/radio-block.vue';
import { ClyWorldmap } from '../../../javascripts/components/echart/index.js';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatePickerG,
        ClyMoreOptions,
        ClyRadioBlock,
        ClyWorldmap,
        ClyDatatableN
    },
    mixins: [
        commonFormattersMixin,
        i18nMixin,
        autoRefreshMixin,
        dataMixin({
            'externalLinks': '/analytics/countries/links',
        })
    ],
    data: function() {
        var buttonText = "";
        var buttonLink = "#/analytics/geo/countries/All";
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
            buttonText = i18n('common.show') + " " + countlyLocation.getCountryName(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country);
            buttonLink = "#/analytics/geo/countries/" + countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country;
        }
        else {
            buttonText = i18n('common.show') + " " + i18n("countries.table.country");
        }
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            description: i18n('countries.description'),
            path: "",
            buttonText: buttonText,
            buttonLink: buttonLink
        };
    },
    mounted: function() {
        this.refresh(true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyCountry/fetchData', force);
        },
        dateChanged: function() {
            this.refresh(true);
        },
        swithToCityView: function() {
            window.location.href = this.path;
        },
        regionClick: function(region) {
            this.path = "#/analytics/geo/countries/" + region;
            this.$refs.toCityViewLink.href = this.path;
            this.$refs.toCityViewLink.click();
        },
    },
    computed: {
        data: function() {
            return this.$store.state.countlyCountry.data || {};
        },
        chooseProperties: function() {
            var totals = this.data.totals || {};
            totals.t = totals.t || {};
            totals.u = totals.u || {};
            totals.n = totals.n || {};
            return [
                {"value": "t", "label": i18n('common.table.total-sessions'), "trend": totals.t.trend, "number": countlyCommon.getShortNumber(totals.t.total || 0), "trendValue": totals.t.change},
                {"value": "u", "label": i18n('common.table.total-users'), "trend": totals.u.trend, "number": countlyCommon.getShortNumber(totals.u.total || 0), "trendValue": totals.u.change, isEstimate: totals.u.isEstimate, estimateTooltip: i18n("common.estimation")},
                {"value": "n", "label": i18n('common.table.new-users'), "trend": totals.n.trend, "number": countlyCommon.getShortNumber(totals.n.total || 0), "trendValue": totals.n.change}
            ];
        },
        geoChartData: function() {
            var geoChart = [];
            var table = this.data.table || [];
            var selectedProperty = this.$store.state.countlyCountry.selectedProperty || "t";

            var title = "";
            if (selectedProperty === "t") {
                geoChart.push(["Country", i18n('common.table.total-sessions'), {role: 'tooltip', p: {html: true}}]);
                title = i18n('common.table.total-sessions');
            }
            else if (selectedProperty === "u") {
                geoChart.push(["Country", i18n('common.table.total-users'), {role: 'tooltip', p: {html: true}}]);
                title = i18n('common.table.total-users');
            }
            else {
                geoChart.push(["Country", i18n('common.table.new-users'), {role: 'tooltip', p: {html: true}}]);
                title = i18n('common.table.new-users');
            }
            for (var k = 0; k < table.length; k++) {
                var cc = "<img src='" + countlyGlobal.path + "/images/flags/" + (table[k].code || "unknown") + ".png'/><p class='number'>" + table[k][selectedProperty] + "</p><p>" + title + "</p>";
                geoChart.push([{"v": table[k].country, "f": table[k].countryTranslated}, table[k][selectedProperty], cc]);
            }
            return geoChart;
        },
        countriesData: function() {
            var geoChart = {};
            var table = this.data.table || [];
            var selectedProperty = this.$store.state.countlyCountry.selectedProperty || "t";
            for (var k = 0; k < table.length; k++) {
                geoChart[table[k].country] = {"value": table[k][selectedProperty]};
            }
            return geoChart;
        },
        countryTable: function() {
            this.data.table = this.data.table || [];
            for (var z = 0; z < this.data.table.length; z++) {
                this.data.table[z].flag = countlyGlobal.path + "/images/flags/" + (this.data.table[z].code || "unknown") + ".svg";
            }
            return this.data.table;
        },
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyCountry/onSetSelectedProperty', value);
            },
            get: function() {
                return this.$store.state.countlyCountry.selectedProperty;
            }
        },
        selectedPropertyTitle: function() {
            var selectedProperty = this.$store.state.countlyCountry.selectedProperty || "t";
            if (selectedProperty === 't') {
                return i18n('common.table.total-sessions');
            }
            else if (selectedProperty === 'u') {
                return i18n('common.table.total-users');
            }
            else if (selectedProperty === 'n') {
                return i18n('common.table.new-users');
            }
        },
        isLoading: function() {
            return this.$store.state.countlyCountry.isLoading;
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        }
    }
};
</script>
