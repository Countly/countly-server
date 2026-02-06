<template>
    <div>
        <clyd-home-widget-header :widget="headerData"></clyd-home-widget-header>
        <div class="session-home-widget">
            <el-tabs v-model="sessionGraphTab" type="card" stretch v-loading="isLoading">
                <el-tab-pane :name="item.value" :key="idx" v-for="(item, idx) in chooseProperties" >
                    <div slot="label">
                        <div class="color-cool-gray-100 bu-p-5" :data-test-id="`tab-box-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">
                            <div class="bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between" :data-test-id="`tab-box-label-tooltip-container-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">
                                <div class="text-medium" :data-test-id="`tab-box-label-tooltip-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">
                                    <span :data-test-id="`tab-box-label-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">{{item.label}}</span>
                                    <cly-tooltip-icon v-if="item.description" class="bu-ml-1" :tooltip="item.description" placement="top-center" :data-test-id="`tab-box-tooltip-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`"></cly-tooltip-icon>
                                </div>
                            </div>
                            <div class="bu-is-flex bu-is-align-items-center number" :data-test-id="`tab-box-center-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">
                                <h2 :data-test-id="`tab-box-center-item-number-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">{{item.number}}</h2>
                                <div v-if="item.trend == 'u'" class="cly-trend-up" :data-test-id="`tab-box-center-item-trend-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">
                                    <i class="cly-trend-up-icon ion-android-arrow-up bu-ml-2" :data-test-id="`tab-box-center-item-trend-icon-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`"></i><span :data-test-id="`tab-box-center-item-trend-value-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">{{item.trendValue}}</span>
                                </div>
                                <div v-if="item.trend == 'd'" class="cly-trend-down" :data-test-id="`tab-box-center-item-trend-icon-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">
                                    <i class="cly-trend-down-icon ion-android-arrow-down bu-ml-2" :data-test-id="`tab-box-center-item-trend-icon-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`"></i><span :data-test-id="`tab-box-center-item-trend-value-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`">{{item.trendValue}}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="bu-pb-4" :data-test-id="`tab-box-chart-${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`" style="border-radius: 0 0px 4px 4px; background-color: #ffffff; border: 1px solid #ececec ">
                        <cly-chart-time :val-formatter="item.formatter" :test-id="`${item.label.toLowerCase().replace('.', '').replaceAll(/\s/g, '-')}`" :option="chartData(item.value)" category="sessionHomeWidget"></cly-chart-time>
                    </div>
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script>
import jQuery from 'jquery';
import { i18n } from '../../../javascripts/countly/vue/core.js';
import countlySession from '../../../javascripts/countly/countly.session.js';
import countlyTotalUsers from '../../../javascripts/countly/countly.total.users.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import ClyTooltipIcon from '../../../javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyChartTime from '../../../javascripts/components/echart/cly-chart-time.vue';

const $ = jQuery;

export default {
    components: {
        ClyTooltipIcon,
        ClyChartTime
    },
    data: function() {
        return {
            description: i18n('session-overview.description'),
            dataBlocks: [],
            data: {},
            lineOptions: {"series": []},
            chooseProperties: this.calculateProperties(),
            chosenProperty: "t",
            sessionGraphTab: "t",
            isLoading: true,
            headerData: {
                label: i18n("dashboard.audience"),
                description: i18n("session-overview.description"),
                linkTo: {"label": i18n('dashboard.go-to-sessions'), "href": "#/analytics/sessions"},
            }
        };
    },
    mounted: function() {
        var self = this;
        $.when(countlySession.initialize(), countlyTotalUsers.initialize("users"), countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID])).then(function() {
            self.calculateAllData();
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                this.isLoading = true;
            }
            $.when(countlySession.initialize(), countlyTotalUsers.initialize("users"), countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID])).then(function() {
                self.calculateAllData();
            });
        },
        chartData: function(value) {
            return this.calculateSeries(value);
        },
        calculateAllData: function() {
            this.isLoading = false;
            this.chooseProperties = this.calculateProperties();
            this.lineOptions = this.calculateSeries();
        },
        calculateProperties: function() {
            var sessionData = countlySession.getSessionData();
            if (!sessionData || !sessionData.usage || !sessionData.usage['total-sessions']) {
                sessionData = {"usage": {"totals-sessions": {}}};
            }

            var properties = [];
            //keep this way to allow also switching to different columns for different types later.  Supports also more or less columns.
            if (sessionData.usage['total-sessions']) {
                properties.push({
                    "value": "t",
                    "label": i18n('common.table.total-sessions'),
                    "trend": sessionData.usage['total-sessions'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['total-sessions'].total || 0),
                    "trendValue": sessionData.usage['total-sessions'].change,
                    "description": i18n('dashboard.total-sessions-desc'),
                });
            }
            if (sessionData.usage['new-users']) {
                properties.push({
                    "value": "n",
                    "label": i18n('common.table.new-sessions'),
                    "trend": sessionData.usage['new-users'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['new-users'].total || 0),
                    "trendValue": sessionData.usage['new-users'].change,
                    "description": i18n('common.table.new-users-desc')
                });
            }

            if (sessionData.usage['total-duration']) {
                properties.push({
                    "value": "d",
                    "label": i18n('dashboard.time-spent'),
                    "trend": sessionData.usage['total-duration'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['total-duration'].total || 0),
                    "trendValue": sessionData.usage['total-duration'].change,
                    "description": i18n('dashboard.time-spent-desc'),
                    "formatter": function(value) {
                        return countlyCommon.formatSecond(value);
                    }
                });
            }

            if (sessionData.usage['avg-duration-per-session']) {
                properties.push({
                    "value": "d-avg",
                    "label": i18n('dashboard.avg-time-spent'),
                    "trend": sessionData.usage['avg-duration-per-session'].trend,
                    "number": countlyCommon.getShortNumber(sessionData.usage['avg-duration-per-session'].total || 0),
                    "trendValue": sessionData.usage['avg-duration-per-session'].change,
                    "description": i18n('dashboard.avg-time-spent-desc'),
                    "formatter": function(value) {
                        return countlyCommon.formatSecond(Math.round(value));
                    }
                });
            }

            return properties;
        },
        calculateSeries: function(value) {
            var sessionDP = {};
            value = value || this.chosenProperty;
            switch (value) {
            case "t":
                sessionDP = countlySession.getSessionDPTotal();
                break;
            case "n":
                sessionDP = countlySession.getUserDPNew();
                if (sessionDP && sessionDP.chartDP && sessionDP.chartDP.length > 1) {
                    sessionDP.chartDP[1].label = i18n('common.table.new-sessions');
                    sessionDP.chartDP[0].label = i18n('common.table.new-sessions');
                }
                break;
            case "d":
                sessionDP = countlySession.getDurationDP(true); //makes sure I get seconds, not minutes
                if (sessionDP && sessionDP.chartDP && sessionDP.chartDP.length > 1) {
                    sessionDP.chartDP[1].label = i18n('dashboard.time-spent');
                    sessionDP.chartDP[0].label = i18n('dashboard.time-spent');
                }
                break;
            case "d-avg":
                sessionDP = countlySession.getDurationDPAvg(true);//makes sure I get seconds, not minutes
                if (sessionDP && sessionDP.chartDP && sessionDP.chartDP.length > 1) {
                    sessionDP.chartDP[1].label = i18n('dashboard.avg-time-spent');
                    sessionDP.chartDP[0].label = i18n('dashboard.avg-time-spent');
                }
                break;
            }
            var series = [];
            if (sessionDP && sessionDP.chartDP && sessionDP.chartDP[0] && sessionDP.chartDP[1]) {
                series.push({"name": sessionDP.chartDP[1].label, "data": sessionDP.chartDP[1].data});
                series.push({"name": sessionDP.chartDP[0].label + " (" + i18n('common.previous-period') + ")", "data": sessionDP.chartDP[0].data, "color": "#39C0C8", lineStyle: {"color": "#39C0C8"} });
            }
            if (value === "d" || value === "d-avg") {
                return {
                    "series": series,
                    "yAxis": {
                        axisLabel: {
                            formatter: function(value2) {
                                return countlyCommon.formatSecond(Math.round(value2));
                            }
                        }
                    }
                };
            }
            else {
                return {"series": series};
            }
        }
    },
    computed: {
        selectedProperty: {
            set: function(value) {
                this.chosenProperty = value;
                this.calculateAllData();
            },
            get: function() {
                return this.chosenProperty;
            }
        }
    }
};
</script>
