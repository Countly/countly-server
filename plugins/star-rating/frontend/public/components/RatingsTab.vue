<template>
    <div class="ratings-tab-view">
        <cly-header>
            <template v-slot:header-left>
                <h2 data-test-id="ratings-header-title">{{ i18n('feedback.ratings') }} </h2>
                &nbsp; <cly-tooltip-icon data-test-id="ratings-header-tooltip" :tooltip="i18n('ratings.tooltip.ratings')" icon="ion-help-circled"></cly-tooltip-icon>
            </template>
            <template v-slot:header-right></template>
        </cly-header>
        <cly-main>
            <div class="bu-level bu-mb-5">
                <div class="bu-level-left">
                    <div class="bu-level-item">
                        <span data-test-id="ratings-result-for-label">{{ i18n('feedback.results-for') }}</span>
                        <cly-multi-select test-id="ratings-filter-parameters-dropdown" :content-data-test-id="{title: 'ratings-filter-parameters-header-label', reset: 'ratings-filter-parameters-reset-button'}" class="bu-ml-3 ratings-tab-view__filter-selector" @change="filterUpdated()" @updated="prepareVersions" v-model="activeFilter" :fields="activeFilterFields"></cly-multi-select>
                    </div>
                </div>
                <div class="bu-level-right">
                    <div class="bu-level-item">
                        <cly-date-picker-g test-id="ratings-date-range-select-dropdown" placement="bottom-end"></cly-date-picker-g>
                    </div>
                </div>
            </div>
            <cly-section>
                <cly-metric-cards :multiline="false">
                    <cly-metric-card test-id="ratings-total-ratings" :number="count" :label="i18n('feedback.total-ratings')" :tooltip="i18n('ratings.tooltip.total-ratings')">
                    </cly-metric-card>
                    <cly-metric-card test-id="ratings-average-ratings-score" :number="avg" :label="i18n('feedback.average-ratings-score')" :tooltip="i18n('ratings.tooltip.average-ratings-score')">
                    </cly-metric-card>
                </cly-metric-cards>
            </cly-section>
            <cly-section>
                <cly-chart-bar data-test-id="ratings-main-bar-chart" test-id="ratings-chart" v-loading="isLoading" :force-loading="isLoading" class="ratings-wrapper__bar-chart bu-has-background-white" :option="barOptions"></cly-chart-bar>
            </cly-section>
            <cly-dynamic-tabs :comments="feedbackData.aaData" :ratings="cumulativeData" :loadingState="isLoading" :filter="activeFilter" skin="secondary" v-model="dynamicTab" :tabs="tabs">
                <template v-slot:tables="scope">
                    <span>{{scope.tab.title}}</span>
                </template>
            </cly-dynamic-tabs>
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { i18n, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import starRatingPlugin from '../store/index.js';
import RatingsTable from './RatingsTable.vue';
import CommentsTable from './CommentsTable.vue';
import ClyHeader from '../../../../../frontend/express/public/javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyMultiSelect from '../../../../../frontend/express/public/javascripts/components/dropdown/multi-select.vue';
import ClyDatePickerG from '../../../../../frontend/express/public/javascripts/components/date/global-date-picker.vue';
import ClyMetricCards from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-cards.vue';
import ClyMetricCard from '../../../../../frontend/express/public/javascripts/components/helpers/cly-metric-card.vue';
import ClyChartBar from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-bar.vue';
import ClyDynamicTabs from '../../../../../frontend/express/public/javascripts/components/nav/cly-dynamic-tabs.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyTooltipIcon,
        ClyMultiSelect,
        ClyDatePickerG,
        ClyMetricCards,
        ClyMetricCard,
        ClyChartBar,
        ClyDynamicTabs
    },
    mixins: [countlyVue.mixins.i18n, autoRefreshMixin],
    data: function() {
        return {
            activeFilter: {
                platform: "",
                version: "",
                widget: ""
            },
            barOptions: {
                xAxis: {
                    data: [1, 2, 3, 4, 5]
                },
                series: [
                    {
                        name: i18n('feedback.ratings'),
                        data: [0, 0, 0, 0, 0]
                    }
                ]
            },
            tabs: [
                {
                    title: i18n('feedback.ratings'),
                    name: 'ratings-table',
                    component: RatingsTable,
                    dataTestId: "ratings-data-table-tab-ratings"
                },
                {
                    title: i18n('feedback.comments'),
                    name: 'comments-table',
                    component: CommentsTable,
                    dataTestId: "ratings-data-table-tab-comments"
                }
            ],
            dynamicTab: 'ratings-table',
            feedbackData: [],
            cumulativeData: [],
            rating: {},
            platform_version: {},
            sum: 0,
            avg: 0,
            count: 0,
            comments: [],
            platformOptions: [{label: 'All Platforms', value: ''}],
            widgetOptions: [{label: 'All Widgets', value: ''}],
            versionOptions: [{label: 'All Versions', value: ''}],
            isLoading: false
        };
    },
    methods: {
        refresh: function(force) {
            this.fetch(force);
        },
        dateChanged: function() {
            this.fetch(true);
        },
        matchPlatformVersion: function(documentName) {
            var regexString = '';
            if (this.activeFilter.platform === '') {
                regexString += '(\\w+)(\\*\\*)';
            }
            else {
                regexString += this.activeFilter.platform.toString().toUpperCase() + '(\\*\\*)';
            }
            if (this.activeFilter.version === '') {
                regexString += '(.*)(\\*\\*)[1-5]';
            }
            else {
                regexString += this.activeFilter.version.toString() + '(\\*\\*)[1-5]';
            }
            if (this.activeFilter.widget !== '') {
                regexString += '(\\*\\*)' + this.activeFilter.widget.toString();
            }
            return (new RegExp(regexString, 'i')).test(documentName);
        },
        calCumulativeData: function() {
            var self = this;
            self.count = 0;
            self.avg = 0;
            self.sum = 0;
            self.cumulativeData = [
                { rating: 0, count: 0, percent: 0 },
                { rating: 1, count: 0, percent: 0 },
                { rating: 2, count: 0, percent: 0 },
                { rating: 3, count: 0, percent: 0 },
                { rating: 4, count: 0, percent: 0 }
            ];

            var ratingArray = [];
            var result = self.rating;
            var periodArray = countlyCommon.getPeriodObj().currentPeriodArr;

            var idMap = {};
            self.widgets.forEach(function(obj) {
                idMap[obj._id] = obj;
            });

            for (var i = 0; i < periodArray.length; i++) {
                var dateArray = periodArray[i].split('.');
                var year = dateArray[0];
                var month = dateArray[1];
                var day = dateArray[2];
                if (result[year] && result[year][month] && result[year][month][day]) {
                    for (var rating in result[year][month][day]) {
                        if (self.matchPlatformVersion(rating)) {
                            var rank = (rating.split("**"))[2];
                            var widget = (rating.split("**"))[3];
                            if (self.cumulativeData[rank - 1] && idMap[widget]) {
                                self.cumulativeData[rank - 1].count += result[year][month][day][rating].c;
                                self.count += result[year][month][day][rating].c;
                                self.sum += (result[year][month][day][rating].c * rank);
                                self.avg = self.sum / self.count;
                                var times = result[year][month][day][rating].c;
                                while (times--) {
                                    ratingArray.push(parseInt(rank));
                                }
                            }
                        }
                    }
                }
            }

            self.barOptions.series[0].data = [];
            self.cumulativeData.forEach(function(star) {
                self.barOptions.series[0].data.push(star.count);
            });

            self.cumulativeData.forEach(function(star) {
                if (self.count !== 0) {
                    star.percent = ((star.count / self.count) * 100).toFixed(1);
                }
            });

            ratingArray.sort();
        },
        fetch: function(force) {
            var self = this;
            if (force) {
                self.isLoading = true;
            }
            $.when(starRatingPlugin.requestPlatformVersion(), starRatingPlugin.requestRatingInPeriod(), starRatingPlugin.requesPeriod(), starRatingPlugin.requestFeedbackWidgetsData())
                .then(function() {
                    self.isLoading = false;
                    self.platform_version = starRatingPlugin.getPlatformVersion();
                    self.widgets = starRatingPlugin.getFeedbackWidgetsData();
                    self.rating = starRatingPlugin.getRatingInPeriod();
                    self.calCumulativeData();
                });
        },
        prepareVersions: function(newValue) {
            var self = this;
            self.versionOptions = [{label: 'All Versions', value: ''}];
            if (newValue.platform !== '') {
                for (var i = 0; i < self.platform_version[newValue.platform].length; i++) {
                    self.versionOptions.push({ label: self.platform_version[newValue.platform][i], value: self.platform_version[newValue.platform][i] });
                }
            }
        },
        filterUpdated: function() {
            this.calCumulativeData();
        }
    },
    computed: {
        activeFilterFields: function() {
            var self = this;
            self.platformOptions = [{label: 'All Platforms', value: ''}];
            self.widgetOptions = [{label: 'All Widgets', value: ''}];

            for (var platform in self.platform_version) {
                self.platformOptions.push({ label: platform, value: platform });
            }

            for (var widget in self.widgets) {
                self.widgetOptions.push({ label: self.widgets[widget].popup_header_text, value: self.widgets[widget]._id });
            }

            return [
                {
                    label: "Platform",
                    key: "platform",
                    items: self.platformOptions,
                    dataTestId: {label: "ratings-filter-parameters-platform-label", dropdown: "ratings-filter-parameters-platform-dropdown"},
                    default: ""
                },
                {
                    label: "App Version",
                    key: "version",
                    items: self.versionOptions,
                    dataTestId: {label: "ratings-filter-parameters-version-label", dropdown: "ratings-filter-parameters-version-dropdown"},
                    default: ""
                },
                {
                    label: "Widget",
                    key: "widget",
                    items: self.widgetOptions,
                    dataTestId: {label: "ratings-filter-parameters-widget-label", dropdown: "ratings-filter-parameters-widget-dropdown"},
                    default: ""
                }
            ];
        }
    },
    created: function() {
        this.fetch(true);
    }
};
</script>
