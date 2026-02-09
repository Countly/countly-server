<template>
    <div class="technology-analytics-wrapper-browser">
        <cly-header
            :title="i18n('browser.title')"
            :tooltip="{ description }"
        >
            <template v-slot:header-right>
                <cly-more-options v-if="topDropdown" size="small">
                    <el-dropdown-item :key="idx" v-for="(item, idx) in topDropdown" :command="{ url: item.value }">{{ item.label }}</el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="bu-mb-5"></cly-date-picker-g>
            <div class="bu-columns bu-is-gapless">
                <h4>{{ i18n('browser.browser-for') }}</h4>
                <div class="selector_wrapper">
                    <el-select v-model="selectedProperty" :arrow="false" :adaptiveLength="true">
                        <el-option :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseProperties"></el-option>
                    </el-select>
                </div>
            </div>
            <div class="technology-analytics-wrapper-browser__items bu-pb-5" v-loading="isLoading">
                <vue-scroll :ops="scrollCards" ref="topSlider" @handle-scroll="handleCardsScroll">
                    <cly-metric-cards :multiline="false" :is-synced-scroll="true">
                        <cly-metric-card
                            :is-percentage="true"
                            :column-width="3"
                            :color="item.color"
                            :number="item.percent"
                            :key="idx"
                            v-for="(item, idx) in browserItems">
                            {{ item.name }}
                            <template v-slot:number>{{ item.value }}</template>
                            <template v-slot:description>
                                <span class="text-medium">{{ item.percentText }}</span>
                            </template>
                        </cly-metric-card>
                        <div v-if="browserItems.length < 4 && !isLoading" class="technology-analytics-wrapper-browser__empty-card">
                            <div class="text-medium">{{ i18n('common.table.no-data') }}</div>
                        </div>
                    </cly-metric-cards>
                </vue-scroll>
            </div>
            <h5 class="bu-pb-4">{{ i18n('browser.version-distribution') }}</h5>
            <div v-if="browserVersions.length === 0 && !isLoading" class="technology-analytics-wrapper-browser__versions-empty-card">
                <div class="text-medium">{{ i18n('common.table.no-data') }}</div>
            </div>
            <div v-else-if="browserVersions.length === 0 && isLoading">
                <div style="height: 200px;" v-loading="isLoading"></div>
            </div>
            <div v-else v-loading="isLoading" class="technology-analytics-wrapper-browser__versions">
                <vue-scroll :ops="scrollCards" ref="bottomSlider" @handle-scroll="handleBottomScroll">
                    <cly-metric-cards :multiline="false" :is-synced-scroll="true">
                        <cly-metric-breakdown
                            :name="item.name"
                            :values="item.values"
                            :key="idx"
                            :column-width="3"
                            :scroll-ops="breakdownScrollOps"
                            v-for="(item, idx) in browserVersions">
                        </cly-metric-breakdown>
                        <div v-if="browserItems.length < 4 && !isLoading" class="technology-analytics-wrapper-browser__empty-card">
                            <div class="text-medium">{{ i18n('common.table.no-data') }}</div>
                        </div>
                    </cly-metric-cards>
                </vue-scroll>
            </div>
            <cly-dynamic-tabs v-model="dynamicTab" skin="secondary" :tabs="tabs"></cly-dynamic-tabs>
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { autoRefreshMixin, i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import BrowserTable from './BrowserTable.vue';
import VersionTable from './VersionTable.vue';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';

export default {
    mixins: [
        countlyVue.mixins.i18n,
        dataMixin({ 'externalLinks': '/analytics/browsers/links' }),
        autoRefreshMixin
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
            description: i18n('browser.page-desc'),
            dynamicTab: "browser-table",
            browserTabs: [
                {
                    title: i18n('browser.title'),
                    name: "browser-table",
                    component: BrowserTable
                },
                {
                    title: i18n('browser.versions'),
                    name: "version-table",
                    component: VersionTable
                }
            ]
        };
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchBrowser');
    },
    methods: {
        refresh: function(force) {
            if (force) {
                this.$store.dispatch('countlyDevicesAndTypes/fetchBrowser', true);
            }
            else {
                this.$store.dispatch('countlyDevicesAndTypes/fetchBrowser', false);
            }
        },
        dateChanged: function() {
            this.refresh(true);
        },
        handleCardsScroll: function() {
            if (this.$refs && this.$refs.bottomSlider) {
                var pos1 = this.$refs.topSlider.getPosition();
                pos1 = pos1.scrollLeft;
                this.$refs.bottomSlider.scrollTo({ x: pos1 }, 0);
            }
        },
        handleBottomScroll: function() {
            if (this.$refs && this.$refs.topSlider) {
                var pos1 = this.$refs.bottomSlider.getPosition();
                pos1 = pos1.scrollLeft;
                this.$refs.topSlider.scrollTo({ x: pos1 }, 0);
            }
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
            return ["#017AFF", "#39C0C8", "#F5C900", "#6C47FF", "#017AFF"];
        },
        appBrowser: function() {
            return this.$store.state.countlyDevicesAndTypes.appBrowser;
        },
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        chooseProperties: function() {
            return [
                { "value": "t", "name": i18n('common.table.total-sessions') },
                { "value": "u", "name": i18n('common.table.total-users') },
                { "value": "n", "name": i18n('common.table.new-users') }
            ];
        },
        browserItems: function() {
            var display = [];
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var data = this.appBrowser.chartData || [];

            for (var k = 0; k < data.length; k++) {
                var percent = Math.round((data[k][property] || 0) * 1000 / (this.appBrowser.totals[property] || 1)) / 10;
                display.push({
                    "name": data[k].browser,
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
        browserVersions: function() {
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var returnData = [];
            var browsers = this.appBrowser.versions || [];

            for (var z = 0; z < browsers.length; z++) {
                var display = [];
                var data = browsers[z].data;
                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (browsers[z][property] || 1)) / 10;
                    display.push({
                        "name": data[k].browser_version,
                        "description": countlyCommon.getShortNumber(data[k][property] || 0),
                        "percent": percent,
                        "bar": [{
                            percentage: percent,
                            color: this.graphColors[z]
                        }]
                    });
                }
                returnData.push({ "values": display, "label": browsers[z].label, itemCn: display.length });
            }

            var orderedDataArray = [];

            for (var i = 0; i < this.browserItems.length; i++) {
                for (var j = 0; j < returnData.length; j++) {
                    if (this.browserItems[i].name === returnData[j].label) {
                        orderedDataArray.push(returnData[j]);
                    }
                }
            }

            return orderedDataArray;
        },
        appBrowserRows: function() {
            return this.appBrowser.chartData;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.browserLoading;
        },
        tabs: function() {
            return this.browserTabs;
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