<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :isHeaderTop=true
            :title="title"
            :tooltip="{description, placement:'top-center'}"
        >
            <template v-slot:header-top>
                <a class="back back-link" href="#/analytics/geo/countries">Back to Countries</a>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="geo-date-picker-container"></cly-date-picker-g>
            <cly-section class="geo-analytics-data geo-countries-section">
                <div class="bu-columns bu-is-gapless" style="height: 534px;">
                    <div class="radio-column">
                        <cly-radio-block v-bind:items="chooseProperties" v-model="selectedProperty" v-loading="isLoading"></cly-radio-block>
                    </div>
                    <div class="bu-column" style="position:relative">
                        <cly-worldmap
                            v-loading="isLoading"
                            :block-auto-loading="true"
                            style="height: 100%;"
                            :external-country="region"
                            external-detail-mode="cities"
                            :value-type="selectedPropertyTitle"
                            :show-detail-mode-select="false"
                            :show-navigation="false"
                            :countries-data="countriesData"
                            :cities-data="citiesData">
                        </cly-worldmap>
                    </div>
                </div>
            </cly-section>
            <cly-section>
                <cly-datatable-n :rows="cityTable" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column sortable="custom" prop="city" :label="i18n('countries.table.city')"></el-table-column>
                        <el-table-column sortable="custom" prop="t" :label="i18n('common.table.total-sessions')">
                            <template slot-scope="scope">
                                {{formatNumber(scope.row.t)}}
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="u" :label="i18n('common.table.total-users')">
                            <template slot-scope="scope">
                                {{formatNumber(scope.row.u)}}
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="n" :label="i18n('common.table.new-users')">
                            <template slot-scope="scope">
                                {{formatNumber(scope.row.n)}}
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
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyLocation from '../../../javascripts/countly/countly.location.js';

import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyRadioBlock from '../../../javascripts/components/input/radio-block.vue';
import { ClyWorldmap } from '../../../javascripts/components/echart/index.js';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatePickerG,
        ClyRadioBlock,
        ClyWorldmap,
        ClyDatatableN
    },
    mixins: [
        commonFormattersMixin,
        i18nMixin,
        autoRefreshMixin
    ],
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            description: i18n('countries.city.description'),
            path: countlyGlobal.path,
            region: this.$route.params.region || "TR",
            title: countlyLocation.getCountryName(this.$route.params.region || "TR")
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyCities/onSetRegion', this.$route.params.region);
        this.refresh(true);
    },
    methods: {
        refresh: function(force) {
            if (force) {
                this.$store.dispatch('countlyCities/fetchData', force);
            }
            else {
                this.$store.dispatch('countlyCities/fetchData', false);
            }
        },
        dateChanged: function() {
            this.refresh(true);
        }
    },
    computed: {
        data: function() {
            return this.$store.state.countlyCities.data;
        },
        totalData: function() {
            return this.$store.state.countlyCountry.data;
        },
        chooseProperties: function() {
            var totals = this.countryTotals;

            return [
                {"value": "t", "label": i18n('common.table.total-sessions'), "trend": totals.t.trend, "number": countlyCommon.getShortNumber(totals.t.total || 0), "trendValue": totals.t.change},
                {"value": "u", "label": i18n('common.table.total-users'), "trend": totals.u.trend, "number": countlyCommon.getShortNumber(totals.u.total || 0), "trendValue": totals.u.change, isEstimate: totals.u.isEstimate, estimateTooltip: i18n("common.estimation")},
                {"value": "n", "label": i18n('common.table.new-users'), "trend": totals.n.trend, "number": countlyCommon.getShortNumber(totals.n.total || 0), "trendValue": totals.n.change}
            ];
        },
        countryTotals: function() {
            var totals = this.data.totals;
            totals = totals || {"u": {}, "t": {}, "n": {}};
            totals.t = totals.t || {};
            totals.u = totals.u || {};
            totals.n = totals.n || {};
            return totals;
        },
        countriesData: function() {
            var data = {};
            var totals = this.countryTotals;
            var value = totals.t.total || 1;
            data[this.$route.params.region] = {"value": value};
            return data;
        },
        citiesData: function() {
            var data = this.data.cities || [];
            var selectedProperty = this.$store.state.countlyCities.selectedProperty || "t";
            var cityData = {};
            if (data.length > 0) {
                for (var k = 0; k < data.length; k++) {
                    cityData[data[k].city] = {"value": data[k][selectedProperty]};
                }
            }
            var retObj = {};
            retObj[this.$route.params.region] = cityData;
            return retObj;
        },
        cityTable: function() {
            return this.data.table || [];
        },
        selectedPropertyTitle: function() {
            var selectedProperty = this.$store.state.countlyCities.selectedProperty || "t";
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
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyCities/onSetSelectedProperty', value);
            },
            get: function() {
                return this.$store.state.countlyCities.selectedProperty;
            }
        },
        isLoading: function() {
            return this.$store.state.countlyCities.isLoading;
        }
    }
};
</script>
