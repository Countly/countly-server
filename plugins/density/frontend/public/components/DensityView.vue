<template>
<div class="technology-density-wrapper" v-bind:class="[componentId]">
    <cly-header
        :title="i18n('density.title')"
        :tooltip="{description}"
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
            <h4 data-test-id="densities-for-label">{{i18n('density.densities-for')}}</h4>
            <div class ="selector_wrapper">
                <el-select test-id="densities-for" v-model="selectedProperty" :arrow="false" :adaptiveLength="true">
                    <el-option :test-id="item.value" :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseProperties"></el-option>
                </el-select>
            </div>
        </div>
        <div class="technology-density-wrapper__items bu-pb-5" v-loading="isLoading">
            <vue-scroll :ops="scrollCards" ref="topSlider" @handle-scroll="handleCardsScroll">
                <cly-metric-cards :multiline="false" :is-synced-scroll="true">
                    <cly-metric-card
                        :test-id="'density-' + idx"
                        :is-percentage="true"
                        :column-width=3
                        :color="item.color"
                        :number="item.percent"
                        :key="idx"
                        v-for="(item, idx) in densityItems">
                        {{item.name}}
                        <template v-slot:number>{{item.value}}</template>
                        <template v-slot:description>
                            <span class="text-medium">{{item.percentText}}</span>
                        </template>
                    </cly-metric-card>
                    <div v-if="densityItems.length === 0 && !isLoading" class="technology-density-wrapper__empty-card">
                        <div class="text-medium" data-test-id="density-for-no-data-label">{{i18n('common.table.no-data')}}</div>
                    </div>
                </cly-metric-cards>
            </vue-scroll>
        </div>
        <h5 class="bu-pb-4" data-test-id="density-distribution-label"> {{i18n('density.distribution')}} </h5>
        <div v-if="densityVersions.length === 0 && !isLoading" class="technology-density-wrapper__versions-empty-card bu-mb-5">
            <div class="text-medium" data-test-id="density-distribution-no-data-label">{{i18n('common.table.no-data')}}</div>
        </div>
        <div v-else-if="densityVersions.length === 0 && isLoading" class="bu-mb-5">
            <div style="height: 200px;" v-loading="isLoading"></div>
        </div>
        <div v-else v-loading="isLoading" class="technology-density-wrapper__versions">
            <vue-scroll :ops="scrollCards" ref="bottomSlider" @handle-scroll="handleBottomScroll">
                    <cly-metric-cards :multiline="false" :is-synced-scroll="true">
                        <cly-metric-breakdown
                            :test-id="'density-items-' + idx"
                            :name="item.name"
                            :values="item.values"
                            :key="idx"
                            :column-width="3"
                            :scroll-ops="breakdownScrollOps"
                            v-for="(item, idx) in densityVersions">
                        </cly-metric-breakdown>
                    </cly-metric-cards>
            </vue-scroll>
        </div>
        <cly-dynamic-tabs v-model="dynamicTab" skin="secondary" :tabs="tabs"></cly-dynamic-tabs>
    </cly-main>
</div>
</template>

<script>
import { i18n, i18nMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import DensityTableView from './DensityTableView.vue';
import VersionTableView from './VersionTableView.vue';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClyDatePickerG from '../../../../../frontend/express/public/javascripts/components/date/global-date-picker.vue';
import ClyMetricCards from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-cards.vue';
import ClyMetricCard from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-card.vue';
import ClyDynamicTabs from '../../../../../frontend/express/public/javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyHeader,
        ClyMoreOptions,
        ClyMain,
        ClyDatePickerG,
        ClyMetricCards,
        ClyMetricCard,
        ClyDynamicTabs
    },
    mixins: [
        i18nMixin,
        autoRefreshMixin,
        dataMixin({
            'externalLinks': '/analytics/densities/links'
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
            description: i18n('density.page-desc'),
            dynamicTab: "density-table",
            densityTabs: [
                {
                    title: i18n('density.title'),
                    name: "density-table",
                    dataTestId: "densities-table",
                    component: DensityTableView
                },
                {
                    title: i18n('density.versions'),
                    name: "version-table",
                    dataTestId: "versions-table",
                    component: VersionTableView
                }
            ]
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchDensity', true);
    },
    methods: {
        refresh: function(force) {
            this.$store.dispatch('countlyDevicesAndTypes/fetchDensity', force);
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
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        },
        countTotals: function(data) {
            var totalCount = 0;
            data.forEach(function(element) {
                element.values.forEach(function(value) {
                    totalCount += parseInt(value.description, 10);
                });
                element.total = totalCount;
                totalCount = 0;
            });
        }
    },
    computed: {
        selectedProperty: {
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedProperty', value);
            },
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedProperty;
            }
        },
        graphColors: function() {
            return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF"];
        },
        appDensity: function() {
            return this.$store.state.countlyDevicesAndTypes.appDensity;
        },
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        chooseProperties: function() {
            return [{"value": "t", "name": i18n('common.table.total-sessions')}, {"value": "u", "name": i18n('common.table.total-users')}, {"value": "n", "name": i18n('common.table.new-users')}];
        },
        densityItems: function() {
            var display = [];
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var data = this.appDensity.chartData || [];

            for (var k = 0; k < data.length; k++) {
                var percent = Math.round((data[k][property] || 0) * 1000 / (this.appDensity.totals[property] || 1)) / 10;
                display.push({
                    "name": data[k].density,
                    "value": countlyCommon.getShortNumber(data[k][property] || 0),
                    "percent": percent,
                    "percentText": percent + "% " + i18n('common.of-total'),
                    "info": i18n('common.info'),
                    "color": k > 3 ? this.graphColors[k % 4] : this.graphColors[k]
                });
            }
            display.sort(function(a, b) {
                var totalDiff = b.value - a.value;
                if (totalDiff === 0) {
                    return a.name.localeCompare(b.name);
                }
                return totalDiff;
            });
            return display;
        },
        densityVersions: function() {
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var returnData = [];
            var densities = this.appDensity.versions || [];
            for (var z = 0; z < densities.length; z++) {
                var display = [];
                var data = densities[z].data;
                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (densities[z][property] || 1)) / 10;
                    display.push({
                        "name": data[k].density,
                        "description": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "bar": [{
                            percentage: percent,
                            color: z > 3 ? this.graphColors[z % 4] : this.graphColors[z]
                        }
                        ]
                    });
                }
                returnData.push({"values": display, "label": densities[z].label, itemCn: display.length});
            }
            for (var i = 0; i < returnData.length; i++) {
                returnData[i].values.sort(function(a, b) {
                    return parseFloat(b.percent) - parseFloat(a.percent);
                });
                returnData[i].values = returnData[i].values.slice(0, 12);
            }
            this.countTotals(returnData);
            returnData.sort(function(a, b) {
                var totalDiff = b.total - a.total;
                if (totalDiff === 0) {
                    return a.label.localeCompare(b.label);
                }
                return totalDiff;
            });
            return returnData;
        },
        appDensityRows: function() {
            return this.appDensity.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.densityLoading;
        },
        tabs: function() {
            return this.densityTabs;
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
