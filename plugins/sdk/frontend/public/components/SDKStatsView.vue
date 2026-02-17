<template>
    <div class="technology-analytics-wrapper-sdk">
        <cly-header
            title="SDK Stats"
        >
            <template v-slot:header-right>
                <cly-more-options v-if="topDropdown" size="small">
                    <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{url: item.value}">{{item.label}}</el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="bu-mb-5"></cly-date-picker-g>
            <div class="bu-columns bu-is-gapless bu-mt-2">
                <h4 data-test-id="sdk-stats-for-label">Stats for </h4>
                <div class="selector_wrapper">
                    <el-select test-id="sdk-stats-for-combobox" v-model="selectedProperty" :arrow="false" :adaptiveLength="true">
                        <el-option test-id="sdk-stats-for-combobox" :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseProperties"></el-option>
                    </el-select>
                </div>
            </div>
            <div class="technology-analytics-wrapper-sdk__items bu-pb-5" v-loading="isLoading">
                <vue-scroll :ops="scrollCards" ref="topSlider" @handle-scroll="handleCardsScroll">
                    <cly-metric-cards :multiline="false" :is-synced-scroll="true">
                        <cly-metric-card
                            :is-percentage="true"
                            :test-id="'sdk-stats-' + idx"
                            :column-width=3
                            :color="item.color"
                            :number="item.percent"
                            :key="idx"
                            v-for="(item, idx) in sdkItems">
                            {{item.name}}
                            <template v-slot:number>{{item.value}}</template>
                            <template v-slot:description>
                                <span class="text-medium">{{item.percentText}}</span>
                            </template>
                        </cly-metric-card>
                        <div v-if="!sdkItems.length && !isLoading" class="technology-analytics-wrapper-sdk__empty-card">
                            <div class="text-medium" data-test-id="sdk-stats-for-table-no-data-label">{{i18n('common.table.no-data')}}</div>
                        </div>
                    </cly-metric-cards>
                </vue-scroll>
            </div>
            <h4 class="bu-pb-4" data-test-id="sdk-version-distribution-label"> SDK Version Distribution </h4>
            <div v-if="!sdkVersions.length && !isLoading" class="technology-analytics-wrapper-sdk__versions-empty-card">
                <div class="text-medium" data-test-id="sdk-version-distribution-table-no-data-label">{{i18n('common.table.no-data')}}</div>
            </div>
            <div v-else v-loading="isLoading" class="technology-analytics-wrapper-sdk__versions">
                <vue-scroll :ops="scrollCards" ref="bottomSlider" @handle-scroll="handleBottomScroll">
                    <cly-metric-cards :multiline="false" :is-synced-scroll="true">
                        <cly-metric-breakdown
                            :test-id="'sdk-version-distribution-' + idx"
                            :name="item.name"
                            :values="item.values"
                            :key="idx"
                            :column-width="3"
                            :scroll-ops="breakdownScrollOps"
                            v-for="(item, idx) in sdkVersions">
                        </cly-metric-breakdown>
                        <div v-if="!sdkItems.length && !isLoading" class="technology-analytics-wrapper-sdk__empty-card">
                            <div class="text-medium" data-test-id="sdk-version-distribution-metric-card-no-data-label">{{i18n('common.table.no-data')}}</div>
                        </div>
                    </cly-metric-cards>
                </vue-scroll>
            </div>
            <div class="bu-columns bu-is-gapless" style="margin-bottom:0;">
                <h4 class="bu-pb-4" data-test-id="stats-sdk-version-adoption-for-label">SDK Version Adoption for </h4>
                <div class="selector_wrapper">
                    <el-select test-id="stats-sdk-version-adoption-for" v-model="selectedSDK">
                        <el-option :key="item.value" :value="item.value" :label="item.name" v-for="item in versions"></el-option>
                    </el-select>
                </div>
                <h4 data-test-id="stats-sdk-version-adoption-for-as-label">&nbsp;&nbsp;as </h4>
                <div class="selector_wrapper">
                    <el-select test-id="stats-sdk-version-adoption-for-as-combobox" v-model="selectedDisplay" :arrow="false" :adaptiveLength="true">
                        <el-option :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseDisplay"></el-option>
                    </el-select>
                </div>
            </div>
            <cly-section>
                <cly-chart-bar test-id="sdk-version-table" :option="lineOptions" :valFormatter="lineOptions.valFormatter" :patch-x-axis="false" :no-hourly="true" v-loading="isLoading" :force-loading="isLoading" category="user-analytics"> </cly-chart-bar>
            </cly-section>
            <cly-dynamic-tabs v-model="dynamicTab" skin="secondary" :tabs="tabs"></cly-dynamic-tabs>
        </cly-main>
    </div>
</template>
<script>
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { i18n, i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import SDKTableTab from './SDKTableTab.vue';
import SDKVersionTableTab from './SDKVersionTableTab.vue';

export default {
    mixins: [
        i18nMixin,
        autoRefreshMixin,
        dataMixin({
            'externalLinks': '/analytics/sdk/links'
        })
    ],
    data: function() {
        return {
            scrollCards: {
                vuescroll: {},
                scrollPanel: {
                    initialScrollX: false,
                },
                rail: {
                    gutterOfSide: "0px"
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    specifyBorderRadius: "3px",
                    keepShow: false
                }
            },
            breakdownScrollOps: {
                vuescroll: {},
                scrollPanel: {
                    initialScrollX: false,
                },
                rail: {
                    gutterOfSide: "1px",
                    gutterOfEnds: "15px"
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    specifyBorderRadius: "3px",
                    keepShow: true
                }
            },
            dynamicTab: "sdk-table",
            sdkTabs: [
                {
                    title: "SDKs",
                    name: "sdk-table",
                    component: SDKTableTab
                },
                {
                    title: "SDK Versions",
                    name: "version-table",
                    component: SDKVersionTableTab
                }
            ],
            versions: []
        };
    },
    mounted: function() {
        this.$store.dispatch('countlySDK/fetchSDKStats');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySDK/fetchSDKStats');
        },
        handleCardsScroll: function() {
            if (this.$refs && this.$refs.bottomSlider) {
                var pos1 = this.$refs.topSlider.getPosition();
                pos1 = pos1.scrollLeft;
                this.$refs.bottomSlider.scrollTo({x: pos1}, 0);
            }
        },
        handleBottomScroll: function() {
            if (this.$refs && this.$refs.topSlider) {
                var pos1 = this.$refs.bottomSlider.getPosition();
                pos1 = pos1.scrollLeft;
                this.$refs.topSlider.scrollTo({x: pos1}, 0);
            }
        }
    },
    watch: {
        selectedSDK: function(newValue) {
            if (newValue) {
                this.$store.dispatch('countlySDK/onSetSelectedSDK', newValue);
            }
            else {
                this.selectedSDK = this.$store.state.countlySDK.stats.sdk.versions[0].label;
                this.$store.dispatch('countlySDK/onSetSelectedSDK', this.selectedSDK);
            }
            var tempVersions = [];
            for (var k = 0; k < this.$store.state.countlySDK.stats.sdk.versions.length; k++) {
                tempVersions.push({"value": this.$store.state.countlySDK.stats.sdk.versions[k].label, "name": this.$store.state.countlySDK.stats.sdk.versions[k].label});
            }
            this.versions = tempVersions;
        }
    },
    computed: {
        chooseDisplay: function() {
            return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
        },
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlySDK/onSetSelectedProperty', value);
            },
            get: function() {
                return this.$store.state.countlySDK.stats.selectedProperty;
            }
        },
        selectedDisplay: {
            set: function(value) {
                this.$store.dispatch('countlySDK/onSetSelectedDisplay', value);
            },
            get: function() {
                return this.$store.state.countlySDK.stats.selectedDisplay;
            }
        },
        selectedSDK: {
            set: function(value) {
                this.$store.dispatch('countlySDK/onSetSelectedSDK', value);
            },
            get: function() {
                return this.$store.state.countlySDK.stats.selectedSDK;
            }
        },
        graphColors: function() {
            return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
        },
        stats: function() {
            return this.$store.state.countlySDK.stats;
        },
        sdk: function() {
            return this.stats.sdk;
        },
        lineOptions: function() {
            return this.stats.chartData;
        },
        lineLegend: function() {
            return this.stats.legendData;
        },
        chooseProperties: function() {
            return [{"value": "t", "name": i18n('common.table.total-sessions')}, {"value": "u", "name": i18n('common.table.total-users')}, {"value": "n", "name": i18n('common.table.new-users')}];
        },
        sdkItems: function() {
            var display = [];
            var property = this.$store.state.countlySDK.stats.selectedProperty;
            var data = this.sdk.chartData || [];

            for (var k = 0; k < data.length; k++) {
                var percent = Math.round((data[k][property] || 0) * 1000 / (this.sdk.totals[property] || 1)) / 10;
                display.push({
                    "name": data[k].sdks,
                    "value": countlyCommon.getShortNumber(data[k][property] || 0),
                    "percent": percent,
                    "percentText": percent + "% " + i18n('common.of-total'),
                    "info": i18n('common.info'),
                    "color": this.graphColors[k]
                });
            }

            display.sort(function(a, b) {
                return parseFloat(b.percent) - parseFloat(a.percent);
            });

            display = display.slice(0, 12);

            return display;
        },
        sdkVersions: function() {
            var property = this.$store.state.countlySDK.stats.selectedProperty;
            var returnData = [];
            var sdks = this.sdk.versions || [];

            for (var z = 0; z < sdks.length; z++) {
                var display = [];
                var data = sdks[z].data;
                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (sdks[z][property] || 1)) / 10;
                    display.push({
                        "name": data[k].sdk_version,
                        "description": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "bar": [{
                            percentage: percent,
                            color: this.graphColors[z]
                        }]
                    });
                }
                returnData.push({"values": display, "label": sdks[z].label, itemCn: display.length});
            }

            var orderedDataArray = [];

            for (var i = 0; i < this.sdkItems.length; i++) {
                for (var j = 0; j < returnData.length; j++) {
                    if (this.sdkItems[i].name === returnData[j].label) {
                        orderedDataArray.push(returnData[j]);
                    }
                }
            }

            return orderedDataArray;
        },
        sdkRows: function() {
            return this.sdk.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlySDK.stats.isLoading;
        },
        tabs: function() {
            return this.sdkTabs;
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
