<template>
    <div class="technology-analytics-wrapper-sdk">
        <cly-header title="Health Checks" />
        <cly-main>
            <cly-date-picker-g class="bu-mb-5" />
            <cly-section>
                <cly-metric-cards :multiline="false">
                    <cly-metric-card test-id="health-checks-received" formatting="long" :number="totals.hc_hc.total" color="#097EFF" numberClasses="bu-is-flex bu-is-align-items-center">
                        <span class="has-ellipsis">Health Checks Received</span>
                        <span v-if="totals.hc_hc.trend=='d'" slot="description" class="cly-vue-events-overview-top-events__description cly-trend-down"><i class="cly-trend-down-icon ion-android-arrow-down" data-test-id="cly-radio-trend-icon-health-checks-received"></i>{{ totals.hc_hc.change }}</span>
                        <span v-else slot="description" class="cly-vue-events-overview-top-events__description cly-trend-up"><i class="cly-trend-up-icon ion-android-arrow-up" data-test-id="cly-radio-trend-icon-health-checks-received"></i>{{ totals.hc_hc.change }}</span>
                    </cly-metric-card>
                    <cly-metric-card test-id="sdk-error-logs" :number="totals.hc_el.total" color="#097EFF" numberClasses="bu-is-flex bu-is-align-items-center">
                        <span class="has-ellipsis">SDK Error Logs</span>
                        <span v-if="totals.hc_el.trend=='d'" slot="description" class="cly-vue-events-overview-top-events__description cly-trend-down"><i class="cly-trend-down-icon ion-android-arrow-down" data-test-id="cly-radio-trend-icon-sdk-error-logs"></i>{{ totals.hc_el.change }}</span>
                        <span v-else slot="description" class="cly-vue-events-overview-top-events__description cly-trend-up"><i class="cly-trend-up-icon ion-android-arrow-up" data-test-id="cly-radio-trend-icon-sdk-error-logs"></i>{{ totals.hc_el.change }}</span>
                    </cly-metric-card>
                    <cly-metric-card test-id="sdk-warn-logs" :number="totals.hc_wl.total" color="#097EFF" numberClasses="bu-is-flex bu-is-align-items-center">
                        <span class="has-ellipsis">SDK Warn Logs</span>
                        <span v-if="totals.hc_wl.trend=='d'" slot="description" class="cly-vue-events-overview-top-events__description cly-trend-down"><i class="cly-trend-down-icon ion-android-arrow-down" data-test-id="cly-radio-trend-icon-sdk-warn-logs"></i>{{ totals.hc_wl.change }}</span>
                        <span v-else slot="description" class="cly-vue-events-overview-top-events__description cly-trend-up"><i class="cly-trend-up-icon ion-android-arrow-up" data-test-id="cly-radio-trend-icon-sdk-warn-logs"></i>{{ totals.hc_wl.change }}</span>
                    </cly-metric-card>
                </cly-metric-cards>
            </cly-section>
            <cly-section>
                <cly-chart-line test-id="hcs" xAxisLabelOverflow="unset" :option="lineOptionsHCs" :height="400" v-loading="isLoading" :force-loading="isLoading" category="session" />
            </cly-section>
            <div class="bu-columns bu-is-gapless" style="margin-bottom:0;">
                <h4 class="bu-pb-4" data-test-id="health-check-breakdown-by-status-as-label">Health check breakdown by status as </h4>
                <div class="selector_wrapper">
                    <el-select test-id="health-check-breakdown-by-status-as" v-model="selectedDisplay" :arrow="false" :adaptiveLength="true">
                        <el-option test-id="health-check-breakdown-by-status-as" :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseDisplay" />
                    </el-select>
                </div>
            </div>
            <cly-section>
                <cly-chart-bar test-id="status-codes" :option="lineOptionsStatusCodes" :valFormatter="lineOptionsStatusCodes.valFormatter" :patch-x-axis="false" :no-hourly="true" v-loading="isLoading" :force-loading="isLoading" category="user-analytics" />
            </cly-section>
            <div class="bu-columns bu-is-gapless" style="margin-bottom:0;">
                <h4 class="bu-pb-4" data-test-id="health-check-breakdown-by-errors-as-label">Health check breakdown by errors as </h4>
                <div class="selector_wrapper">
                    <el-select test-id="health-check-breakdown-by-errors-as" v-model="selectedDisplay" :arrow="false" :adaptiveLength="true">
                        <el-option test-id="health-check-breakdown-by-errors-as" :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseDisplay" />
                    </el-select>
                </div>
            </div>
            <cly-section>
                <cly-chart-bar test-id="error-messages" :option="lineOptionsErrorMessages" :valFormatter="lineOptionsErrorMessages.valFormatter" :patch-x-axis="false" :no-hourly="true" v-loading="isLoading" :force-loading="isLoading" category="user-analytics" />
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    mounted: function() {
        this.$store.dispatch('countlySDK/fetchSDKStats');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySDK/fetchSDKStats');
        }
    },
    computed: {
        chooseDisplay: function() {
            return [{"value": "percentage", "name": "percentage"}, {"value": "value", "name": "values"}];
        },
        selectedDisplay: {
            set: function(value) {
                this.$store.dispatch('countlySDK/onSetSelectedDisplay', value);
            },
            get: function() {
                return this.$store.state.countlySDK.stats.selectedDisplay;
            }
        },
        stats: function() {
            return this.$store.state.countlySDK.stats;
        },
        lineOptionsHCs: function() {
            return this.stats.healthCheckChartData;
        },
        lineOptionsStatusCodes: function() {
            return this.stats.statusCodesChartData;
        },
        lineOptionsErrorMessages: function() {
            return this.stats.errorMessagesChartData;
        },
        totals: function() {
            return this.stats.HCTotals;
        },
        isLoading: function() {
            return this.$store.state.countlySDK.stats.isLoading;
        }
    }
};
</script>
