<template>
    <div v-bind:class="[componentId]">
        <cly-header
            :title="i18n('platforms.title')"
            :tooltip="{description: description}"
        >
            <template v-slot:header-right>
                <cly-more-options
                    v-if="topDropdown"
                    size="small"
                >
                    <el-dropdown-item
                        v-for="(item, idx) in topDropdown"
                        :command="{ url: item.value }"
                        :key="idx"
                    >
                        {{ item.label }}
                    </el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="bu-mb-5" />
            <div class="bu-columns bu-is-gapless bu-mt-2">
                <h4 data-test-id="platforms-for-label">
                    {{ i18n('platforms.platforms-for') }}
                </h4>
                <div class="selector_wrapper">
                    <el-select
                        v-model="selectedProperty"
                        adaptive-length
                        :arrow="false"
                        test-id="platforms-for-combobox"
                    >
                        <el-option
                            v-for="item in chooseProperties"
                            :label="item.name"
                            :key="item.value"
                            :test-id="item.value"
                            :value="item.value"
                        />
                    </el-select>
                </div>
            </div>
            <div
                v-loading="isLoading"
                class="technology-analytics-wrapper__items bu-pb-5"
            >
                <vue-scroll
                    :ops="scrollCards"
                    ref="topSlider"
                    @handle-scroll="handleCardsScroll"
                >
                    <cly-metric-cards
                        is-synced-scroll
                        :multiline="false"
                    >
                        <cly-metric-card
                            v-for="(item, idx) in platformItems"
                            :color="item.color"
                            :column-width="3"
                            is-percentage
                            :key="idx"
                            :number="item.percent"
                            :test-id="'platform-' + idx"
                        >
                            {{ item.name }}
                            <template v-slot:number>
                                {{ item.value }}
                            </template>
                            <template v-slot:description>
                                <span class="text-medium">{{ item.percentText }}</span>
                            </template>
                        </cly-metric-card>
                        <div
                            v-if="platformItems.length < 1 && !isLoading"
                            class="technology-analytics-wrapper__empty-card"
                        >
                            <div
                                class="text-medium"
                                data-test-id="platforms-for-no-data-label"
                            >
                                {{ i18n('common.table.no-data') }}
                            </div>
                        </div>
                    </cly-metric-cards>
                </vue-scroll>
            </div>
            <h5
                class="bu-pb-4"
                data-test-id="platforms-version-distribution-label"
            >
                {{ i18n('platforms.version-distribution') }}
            </h5>
            <div
                v-if="platformVersions.length === 0 && !isLoading"
                class="technology-analytics-wrapper__versions-empty-card"
            >
                <div
                    class="text-medium"
                    data-test-id="platforms-version-distribution-no-data-label"
                >
                    {{ i18n('common.table.no-data') }}
                </div>
            </div>
            <div v-else-if="platformVersions.length === 0 && isLoading">
                <div
                    v-loading="isLoading"
                    class="technology-analytics-wrapper__versions-empty-card"
                />
            </div>
            <div
                v-else
                v-loading="isLoading"
                class="technology-analytics-wrapper__versions"
            >
                <vue-scroll
                    :ops="scrollCards"
                    ref="bottomSlider"
                    @handle-scroll="handleBottomScroll"
                >
                    <cly-metric-cards
                        is-synced-scroll
                        :multiline="false"
                    >
                        <cly-metric-breakdown
                            v-for="(item, idx) in platformVersions"
                            :column-width="3"
                            :key="idx"
                            :name="item.name"
                            :scroll-ops="breakdownScrollOps"
                            :test-id="'platform-' + idx"
                            :values="item.values"
                        />
                        <div
                            v-if="platformItems.length < 1 && !isLoading"
                            class="technology-analytics-wrapper__empty-card"
                        >
                            <div class="text-medium">
                                {{ i18n('common.table.no-data') }}
                            </div>
                        </div>
                    </cly-metric-cards>
                </vue-scroll>
            </div>
            <cly-dynamic-tabs
                v-model="dynamicTab"
                skin="secondary"
                :tabs="tabs"
            />
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import PlatformTableView from './PlatformTableView.vue';
import VersionsTableView from './VersionsTableView.vue';
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyMoreOptions from '../../../javascripts/components/dropdown/more-options.vue';
import ClyMetricCards from '../../../javascripts/components/helpers/cly-metric-cards.vue';
import ClyMetricCard from '../../../javascripts/components/helpers/cly-metric-card.vue';
import ClyMetricBreakdown from '../../../javascripts/components/helpers/cly-metric-breakdown.vue';
import ClyDynamicTabs from '../../../javascripts/components/nav/cly-dynamic-tabs.vue';

const CV = countlyVue;

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClyDatePickerG,
        ClyMoreOptions,
        ClyMetricCards,
        ClyMetricCard,
        ClyMetricBreakdown,
        ClyDynamicTabs
    },
    mixins: [
        countlyVue.mixins.i18n,
        countlyVue.container.dataMixin({ externalLinks: '/analytics/platforms/links' }),
        autoRefreshMixin
    ],
    data: function() {
        return {
            breakdownScrollOps: {
                bar: {
                    background: '#A7AEB8',
                    keepShow: true,
                    size: '6px',
                    specifyBorderRadius: '3px'
                },
                rail: {
                    gutterOfEnds: '15px',
                    gutterOfSide: '1px'
                },
                scrollPanel: { initialScrollX: false },
                vuescroll: {}
            },
            chooseProperties: [
                {
                    name: CV.i18n('common.table.total-sessions'),
                    value: 't'
                },
                {
                    name: CV.i18n('common.table.total-users'),
                    value: 'u'
                },
                {
                    name: CV.i18n('common.table.new-users'),
                    value: 'n'
                }
            ],
            description: CV.i18n('platforms.description'),
            dynamicTab: 'platform-table',
            graphColors: [
                '#017AFF',
                '#39C0C8',
                '#F5C900',
                '#6C47FF'
            ],
            tabs: [
                {
                    component: PlatformTableView,
                    dataTestId: 'platforms-table',
                    name: 'platform-table',
                    title: CV.i18n('platforms.title')
                },
                {
                    component: VersionsTableView,
                    dataTestId: 'versions-table',
                    name: 'version-table',
                    title: CV.i18n('platforms.versions')
                }
            ],
            scrollCards: {
                bar: {
                    background: '#A7AEB8',
                    keepShow: false,
                    size: '6px',
                    specifyBorderRadius: '3px'
                },
                rail: { gutterOfSide: '0px' },
                scrollPanel: { initialScrollX: false },
                vuescroll: {}
            }
        };
    },
    computed: {
        appPlatform: function() {
            return this.$store.state.countlyDevicesAndTypes.appPlatform;
        },
        appPlatformRows: function() {
            return this.appPlatform.chartData || [];
        },
        appResolution: function() {
            return this.$store.state.countlyDevicesAndTypes.appResolution;
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.platformLoading;
        },
        platformItems: function() {
            var data = JSON.parse(JSON.stringify(this.appPlatformRows));
            var display = [];
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var self = this;

            data.sort(function(a, b) {
                var totalDiff = b[property] - a[property];

                if (totalDiff === 0) {
                    return a.os_.localeCompare(b.os_);
                }

                return totalDiff;
            });

            for (var k = 0; k < data.length; k++) {
                var percent = Math.round((data[k][property] || 0) * 1000 / (self.appPlatform.totals[property] || 1)) / 10;

                display.push({
                    color: self.graphColors[k % self.graphColors.length],
                    info: 'some description',
                    name: data[k].origos_,
                    percent: percent,
                    percentText: percent + '% ' + CV.i18n('common.of-total'),
                    value: countlyCommon.getShortNumber(data[k][property] || 0)
                });
            }

            return display;
        },
        platformVersions: function() {
            var platforms = JSON.parse(JSON.stringify(this.appPlatform.versions || []));
            var property = this.$store.state.countlyDevicesAndTypes.selectedProperty;
            var returnData = [];
            var self = this;

            for (var z = 0; z < platforms.length; z++) {
                var display = [];
                var data = platforms[z].data;

                for (var k = 0; k < data.length; k++) {
                    var percent = Math.round((data[k][property] || 0) * 1000 / (platforms[z][property] || 1)) / 10;

                    display.push({
                        bar: [{
                            color: self.graphColors[z % self.graphColors.length],
                            percentage: percent
                        }],
                        description: countlyCommon.getShortNumber(data[k][property] || 0),
                        name: data[k].os_versions,
                        percent: percent
                    });
                }

                returnData.push({
                    itemCn: display.length,
                    label: platforms[z].label,
                    values: display
                });
            }

            var indexMap = {};

            this.platformItems.forEach(function(element, index) {
                indexMap[element.name] = index;
            });

            returnData.sort(function(a, b) {
                var nameA = a.label;
                var nameB = b.label;
                var indexA = indexMap[nameA];
                var indexB = indexMap[nameB];

                return indexA - indexB;
            });

            for (var i = 0; i < returnData.length; i++) {
                returnData[i].values.sort(function(a, b) {
                    return parseFloat(b.percent) - parseFloat(a.percent);
                });
                returnData[i].values = returnData[i].values.slice(0, 12);

                // color adjustments after sorting platformVersions to match platformItems
                for (var index = 0; index < returnData[i].values.length; index++) {
                    returnData[i].values[index].bar[0].color = self.platformItems[i].color;
                }
            }

            return returnData;
        },
        selectedProperty: {
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedProperty;
            },
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedProperty', value);
            }
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }

            return null;
        }
    },
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform');
    },
    methods: {
        dateChanged: function() {
            this.refresh(true);
        },
        handleBottomScroll: function() {
            if (this.$refs && this.$refs.topSlider) {
                var x = this.$refs.bottomSlider.getPosition()?.scrollLeft;

                this.$refs.topSlider.scrollTo({ x: x }, 0);
            }
        },
        handleCardsScroll: function() {
            if (this.$refs && this.$refs.bottomSlider) {
                var x = this.$refs.topSlider.getPosition()?.scrollLeft;

                this.$refs.bottomSlider.scrollTo({ x: x }, 0);
            }
        },
        refresh: function(force) {
            force = force === undefined ? false : force;
            this.$store.dispatch('countlyDevicesAndTypes/fetchPlatform', force);
        }
    }
};
</script>
