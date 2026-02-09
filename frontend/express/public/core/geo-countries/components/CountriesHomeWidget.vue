<template>
    <div v-bind:class="[componentId]">
        <clyd-home-widget-header :widget="headerData"></clyd-home-widget-header>
        <cly-section class="geo-countries-section">
            <cly-section class="geo-analytics-data">
                <div class="bu-columns bu-is-gapless" style="height: 534px;">
                    <div style="width:256px;">
                        <cly-radio-block v-bind:items="chooseProperties" type="vertical" v-model="selectedProperty" v-loading="isLoading"></cly-radio-block>
                    </div>
                    <div class="bu-column leaflet-noclick-map" data-test-id="cly-worldmap" style="position:relative">
                        <cly-worldmap
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
                            <a ref="toCityViewLink" :data-test-id="'button-'+ buttonText.replaceAll(' ', '-').toLowerCase()" class="cly-vue-button button-light-skin ToLink" :href="buttonLink">{{buttonText}}</a>
                        </div>
                    </div>
                </div>
            </cly-section>
        </cly-section>
    </div>
</template>

<script>
import { autoRefreshMixin, i18n, commonFormattersMixin, i18nMixin, registerGlobally, unregister } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyGlobal from '../../../javascripts/countly/countly.global.js';
import countlyLocation from '../../../javascripts/countly/countly.location.js';
import countryStore from '../store/countly.country.js';

import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyRadioBlock from '../../../javascripts/components/input/radio-block.vue';
import { ClyWorldmap } from '../../../javascripts/components/echart/index.js';
import ClyHomeWidgetHeader from '../../home/components/HomeWidgetTitle.vue';

export default {
    components: {
        ClySection,
        ClyRadioBlock,
        ClyWorldmap,
        'clyd-home-widget-header': ClyHomeWidgetHeader
    },
    mixins: [
        commonFormattersMixin,
        i18nMixin,
        autoRefreshMixin
    ],
    computed: {
        selectedPropertyTitle: function() {
            var selectedProperty = this.selectedProperty || "t";
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
        }
    },
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
            path: "",
            buttonText: buttonText,
            buttonLink: buttonLink,
            chooseProperties: this.calculateProperties(),
            countriesData: this.calculateCountriesData(),
            selectedProperty: "t",
            headerData: {
                label: i18n("countries.title"),
                description: i18n('countries.description'),
                linkTo: {"label": i18n('countries.go-to-countries'), "href": "#/analytics/geo/countries"}
            }
        };
    },
    beforeCreate: function() {
        this.module = countryStore.getVuexModule();
        registerGlobally(this.module);
    },
    beforeDestroy: function() {
        unregister(this.module.name);
    },
    mounted: function() {
        var self = this;
        this.$store.dispatch('countlyCountry/fetchData', true).then(function() {
            self.chooseProperties = self.calculateProperties();
            self.countriesData = self.calculateCountriesData();
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            this.$store.dispatch('countlyCountry/fetchData', force).then(function() {
                self.chooseProperties = self.calculateProperties();
                self.countriesData = self.calculateCountriesData();
            });
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
        calculateProperties: function() {
            var countlyCountryState = this.$store.state.countlyCountry || {};
            var totals = countlyCountryState.data || {};
            totals = totals.totals || {};
            totals.t = totals.t || {};
            totals.u = totals.u || {};
            totals.n = totals.n || {};
            return [
                {"value": "t", "label": i18n('common.table.total-sessions'), "trend": totals.t.trend || "u", "number": countlyCommon.getShortNumber(totals.t.total || 0), "trendValue": totals.t.change || "NaN"},
                {"value": "u", "label": i18n('common.table.total-users'), "trend": totals.t.trend || "u", "number": countlyCommon.getShortNumber(totals.u.total || 0), "trendValue": totals.u.change || "NaN", isEstimate: totals.u.isEstimate, estimateTooltip: i18n("common.estimation")},
                {"value": "n", "label": i18n('common.table.new-users'), "trend": totals.t.trend || "u", "number": countlyCommon.getShortNumber(totals.n.total || 0), "trendValue": totals.n.change || "NaN"}
            ];
        },
        calculateCountriesData: function() {
            var geoChart = {};
            var countlyCountryState = this.$store.state.countlyCountry || {};
            var data = countlyCountryState.data || {};
            var table = data.table || [];
            var selectedProperty = this.selectedProperty || "t";
            for (var k = 0; k < table.length; k++) {
                geoChart[table[k].country] = {"value": table[k][selectedProperty]};
            }
            return geoChart;
        },
    },
    watch: {
        selectedProperty: function() {
            this.refresh();
        }
    }
};
</script>
