<template>
    <div class="technology-analytics-wrapper-sdk">
        <cly-header title="Request Stats"></cly-header>
        <cly-main>
            <cly-date-picker-g class="bu-mb-5" />
            <cly-section>
                <cly-metric-cards :multiline="false">
                    <cly-metric-card test-id="requests-received" formatting="long" :number="totals.r.total" color="#097EFF" numberClasses="bu-is-flex bu-is-align-items-center">
                        <span class="has-ellipsis">Requests Received</span>
                        <span v-if="totals.r.trend=='d'" slot="description" class="cly-vue-events-overview-top-events__description cly-trend-down"><i class="cly-trend-down-icon ion-android-arrow-down" data-test-id="cly-radio-trend-icon-requests-received"></i>{{ totals.r.change }}</span>
                        <span v-else slot="description" class="cly-vue-events-overview-top-events__description cly-trend-up"><i class="cly-trend-up-icon ion-android-arrow-up" data-test-id="cly-radio-trend-icon-requests-received"></i>{{ totals.r.change }}</span>
                    </cly-metric-card>
                    <cly-metric-card test-id="requests-canceled" :number="totals.c.total" color="#097EFF" numberClasses="bu-is-flex bu-is-align-items-center">
                        <span class="has-ellipsis">Requests Canceled</span>
                        <span v-if="totals.c.trend=='d'" slot="description" class="cly-vue-events-overview-top-events__description cly-trend-down"><i class="cly-trend-down-icon ion-android-arrow-down" data-test-id="cly-radio-trend-icon-requests-canceled"></i>{{ totals.c.change }}</span>
                        <span v-else slot="description" class="cly-vue-events-overview-top-events__description cly-trend-up"><i class="cly-trend-up-icon ion-android-arrow-up" data-test-id="cly-radio-trend-icon-requests-canceled"></i>{{ totals.c.change }}</span>
                    </cly-metric-card>
                    <cly-metric-card test-id="requests-queued" :number="totals.q.total" color="#097EFF" numberClasses="bu-is-flex bu-is-align-items-center">
                        <span class="has-ellipsis">Requests Queued</span>
                        <span v-if="totals.q.trend=='d'" slot="description" class="cly-vue-events-overview-top-events__description cly-trend-down"><i class="cly-trend-down-icon ion-android-arrow-down" data-test-id="cly-radio-trend-icon-requests-queued"></i>{{ totals.q.change }}</span>
                        <span v-else slot="description" class="cly-vue-events-overview-top-events__description cly-trend-up"><i class="cly-trend-up-icon ion-android-arrow-up" data-test-id="cly-radio-trend-icon-requests-queued"></i>{{ totals.q.change }}</span>
                    </cly-metric-card>
                </cly-metric-cards>
            </cly-section>
            <cly-section>
                <cly-chart-line test-id="requests" xAxisLabelOverflow="unset" :option="lineOptionsRequests" :height="400" v-loading="isLoading" :force-loading="isLoading" category="session" />
            </cly-section>
            <cly-section>
                <cly-chart-line test-id="delays" xAxisLabelOverflow="unset" :option="lineOptionsDelays" :valFormatter="lineOptionsDelays.valFormatter" :height="400" v-loading="isLoading" :force-loading="isLoading" category="session" />
            </cly-section>
            <div class="bu-columns bu-is-gapless" style="margin-bottom:0;">
                <h4 class="bu-pb-4" data-test-id="received-request-breakdown-by-type-as-label">Received request breakdown by type as </h4>
                <div class="selector_wrapper">
                    <el-select test-id="request-breakdown-type" v-model="selectedDisplay" :arrow="false" :adaptiveLength="true">
                        <el-option test-id="request-breakdown-type" :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseDisplay" />
                    </el-select>
                </div>
            </div>
            <cly-section>
                <cly-chart-bar test-id="received-request" :option="lineOptionsReceived" :valFormatter="lineOptionsReceived.valFormatter" :patch-x-axis="false" :no-hourly="true" v-loading="isLoading" :force-loading="isLoading" category="user-analytics" />
            </cly-section>
            <div class="bu-columns bu-is-gapless" style="margin-bottom:0;">
                <h4 class="bu-pb-4" data-test-id="canceled-request-breakdown-by-reason-as-label">Canceled request breakdown by reason as </h4>
                <div class="selector_wrapper">
                    <el-select test-id="canceled-request" v-model="selectedDisplay" :arrow="false" :adaptiveLength="true">
                        <el-option test-id="canceled-request" :key="item.value" :value="item.value" :label="item.name" v-for="item in chooseDisplay" />
                    </el-select>
                </div>
            </div>
            <cly-section>
                <cly-chart-bar test-id="canceled-request" :option="lineOptionsCanceled" :valFormatter="lineOptionsCanceled.valFormatter" :patch-x-axis="false" :no-hourly="true" v-loading="isLoading" :force-loading="isLoading" category="user-analytics" />
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
        lineOptionsRequests: function() {
            return this.stats.requestChartData;
        },
        lineOptionsDelays: function() {
            return this.stats.delayChartData;
        },
        lineOptionsReceived: function() {
            return this.stats.receivedChartData;
        },
        lineOptionsCanceled: function() {
            return this.stats.canceledChartData;
        },
        totals: function() {
            return this.stats.requestTotals;
        },
        delays: function() {
            return this.stats.delayTotals;
        },
        isLoading: function() {
            return this.$store.state.countlySDK.stats.isLoading;
        }
    }
};
</script>
