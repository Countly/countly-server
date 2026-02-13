<template>
    <cly-main>
        <div class="bu-level bu-my-4">
            <div class="bu-level-left" data-test-id="consent-requests-for-label">
                Consent Requests for
                <cly-select-x
                        class="bu-ml-3"
                        test-id="consent-requests-for-combobox"
                        :width="300"
                        :arrow="false"
                        :borderless="true"
                        :adaptiveLength="true"
                        :auto-commit="true"
                        :hide-default-tabs="true"
                        :hide-all-options-tab="true"
                        :options="filter0"
                        v-model="selectedfilterforMetrics">
                    </cly-select-x>
            </div>
            <div class="bu-level-right">
                <cly-date-picker-g type="daterange" range-separator="To" start-placeholder="Start date" end-placeholder="End date">
                </cly-date-picker-g>
            </div>
        </div>
        <cly-section>
            <cly-chart-time
                test-id="consent-requests" v-loading="consentDpChartloaded" :force-loading="consentDpChartloaded" :showDownload=false :showToggle=false :showZoom=false :option="consentDpChart" :legend="consentDpChartlegend" category="compliance-hub"> </cly-chart-time>
        </cly-section>
        <div class="bu-is-flex">
            <div class="white-bg cly-vue-compliance__user_chart bu-px-5 bu-mr-4 bu-is-flex bu-is-flex-direction-column">
                <div class="bu-is-flex bu-is-flex-direction-column bu-mt-3" style="width:85%; height: 50px">
                    <div class="bu-is-flex bu-is-align-items-center" >
                        <p class="bu-mr-2" data-test-id="user-data-exports-title-label">{{userDatalegend.label}}</p>
                        <cly-tooltip-icon></cly-tooltip-icon>
                    </div>
                    <div class="cly-vue-chart-legend__second-row bu-is-flex">
                        <div class="cly-vue-chart-legend__p-number" data-test-id="user-data-exports-value"> {{formatTableNumber(userDatalegend.value)}}</div>
                        <div class="cly-vue-chart-legend__p-trend bu-is-flex bu-is-align-items-center bu-ml-2" v-bind:class="userDatalegend.class">
                            <i v-if="userDatalegend.trend === 'u'" class="cly-trend-up-icon ion-android-arrow-up bu-ml-2" data-test-id="user-data-exports-arrow-icon"></i>
                            <i v-else class="cly-trend-down-icon ion-android-arrow-down bu-ml-2" data-test-id="user-data-exports-arrow-icon"></i>
                            <div data-test-id="user-data-exports-percentage">{{userDatalegend.percentage}}</div>
                        </div>
                    </div>
                </div>
                <cly-chart-time test-id="user-data-exports" v-loading="exportDpChartloaded" :force-loading="exportDpChartloaded" :height="277" :showDownload=false :showToggle=false :showZoom=false :legend="{show:false}" :option.sync="exportDpChart" category="compliance-hub">
                </cly-chart-time>
            </div>
            <div class="white-bg cly-vue-compliance__user_chart bu-px-5 bu-is-flex bu-is-flex-direction-column">
                <div class="bu-is-flex bu-is-flex-direction-column bu-mt-3" style="width:85%; height: 50px;">
                    <div class="bu-is-flex bu-is-align-items-center" >
                        <p class="bu-mr-2" data-test-id="user-data-purges-title-label">{{purgeDatalegend.label}}</p>
                        <cly-tooltip-icon></cly-tooltip-icon>
                    </div>
                    <div class="cly-vue-chart-legend__second-row bu-is-flex">
                        <div class="cly-vue-chart-legend__p-number" data-test-id="user-data-purges-value"> {{formatTableNumber(purgeDatalegend.value)}}</div>
                        <div class="cly-vue-chart-legend__p-trend bu-is-flex bu-is-align-items-center bu-ml-2" v-bind:class="purgeDatalegend.class">
                            <i v-if="purgeDatalegend.trend === 'u'" class="cly-trend-up-icon ion-android-arrow-up bu-ml-2" data-test-id="user-data-purges-arrow-icon"></i>
                            <i v-else class="cly-trend-down-icon ion-android-arrow-down bu-ml-2" data-test-id="user-data-purges-arrow-icon"></i>
                            <div data-test-id="user-data-purges-percentage">{{purgeDatalegend.percentage}}</div>
                        </div>
                    </div>
                </div>
                <cly-chart-time test-id="user-data-purges" v-loading="purgeDpChartloaded" :force-loading="purgeDpChartloaded" :showDownload="false" :showToggle="false" :showZoom="false" :legend="{show:false}" :height="277" :option.sync="purgeDpChart" category="compliance-hub">
                </cly-chart-time>
            </div>
        </div>
    </cly-main>
</template>

<script>
import { i18nMixin, commonFormattersMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyConsentManager from '../store/index.js';

import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyDatePickerG from '../../../../../frontend/express/public/javascripts/components/date/global-date-picker.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyChartTime from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-time.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';

export default {
    mixins: [i18nMixin, commonFormattersMixin],
    components: {
        ClyMain,
        ClySelectX,
        ClyDatePickerG,
        ClySection,
        ClyChartTime,
        ClyTooltipIcon,
    },
    data: function() {
        return {
            consentDpChartloaded: false,
            exportDpChartloaded: false,
            purgeDpChartloaded: false,
            chartLoading: false,
            filter0: [
                { value: 'all', label: this.i18n("common.all") },
                { value: 'sessions', label: this.i18n("compliance_hub.Sessions") },
                { value: "events", label: this.i18n('compliance_hub.Events') },
                { value: 'views', label: this.i18n('compliance_hub.Views') },
                { value: 'scrolls', label: this.i18n('compliance_hub.Scrolls') },
                { value: 'clicks', label: this.i18n('compliance_hub.Clicks') },
                { value: 'forms', label: this.i18n('compliance_hub.Forms') },
                { value: 'crashes', label: this.i18n("compliance_hub.Crashes") },
                { value: 'push', label: this.i18n('compliance_hub.Push') },
                { value: 'attribution', label: this.i18n('compliance_hub.Attribution') },
                { value: 'users', label: this.i18n('compliance_hub.Users') },
                { value: 'star-rating', label: this.i18n('compliance_hub.Star-rating') }
            ],
            selectedfilter0: 'sessions',
        };
    },
    beforeCreate: function() {
        var self = this;
        var payload = {
            "segment": "sessions"
        };
        countlyConsentManager.initialize().then(function() {
            self.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
            self.$store.dispatch("countlyConsentManager/_consentDP", payload);
            self.$store.dispatch("countlyConsentManager/_exportDP", payload);
            self.$store.dispatch("countlyConsentManager/_purgeDP");
            self.$store.dispatch("countlyConsentManager/_ePData");
        });
    },
    computed: {
        selectedfilterforMetrics: {
            get: function() {
                return this.selectedfilter0;
            },
            set: function(newValue) {
                this.selectedfilter0 = newValue;
                this.initializeStoreData();
                this.consentDpChartloaded = true;
                this.purgeDpChartloaded = true;
                this.exportDpChartloaded = true;
            }
        },
        consentDpChart: function() {
            this.consentDpChartloaded = true;
            var consentDp = this.$store.getters["countlyConsentManager/_consentDP"];
            var optinYAxisData = [];
            var optoutYAxisData = [];
            for (var key in consentDp.chartData) {
                optinYAxisData.push(consentDp.chartData[key].i);
                optoutYAxisData.push(consentDp.chartData[key].o);
            }
            if (optinYAxisData.length > 0) {
                this.consentDpChartloaded = false;
            }
            else if (consentDp.chartData) {
                this.consentDpChartloaded = false;
            }
            return {
                series: [
                    {
                        name: "opt-in",
                        data: optinYAxisData,
                    },
                    {
                        name: "opt-out",
                        data: optoutYAxisData
                    }
                ]
            };
        },
        consentDpChartlegend: function() {
            var _bigNumberData = this.$store.getters["countlyConsentManager/_bigNumberData"];
            var legendData = {
                show: true,
                type: "primary",
                data: [{
                    name: "opt-in",
                    label: this.i18n("consent.opt-i"),
                    value: _bigNumberData && _bigNumberData.i ? this.formatNumber(_bigNumberData.i.total) : 0,
                    percentage: _bigNumberData && _bigNumberData.i ? _bigNumberData.i.change : 0,
                    trend: _bigNumberData && _bigNumberData.i ? _bigNumberData.i.trend === 'u' ? "up" : "down" : "-",
                },
                {
                    name: "opt-out",
                    label: this.i18n("consent.opt-o"),
                    value: _bigNumberData && _bigNumberData.o ? this.formatNumber(_bigNumberData.o.total) : 0,
                    percentage: _bigNumberData && _bigNumberData.o ? _bigNumberData.o.change : 0,
                    trend: _bigNumberData && _bigNumberData.o ? _bigNumberData.o.trend === 'u' ? "up" : "down" : "-",
                }
                ],
            };
            return legendData;
        },
        exportDpChart: function() {
            this.exportDpChartloaded = true;
            var exportDP = this.$store.getters["countlyConsentManager/_exportDP"];
            var presentYAxisData = [];
            var previousYAxisData = [];
            for (var key in exportDP.chartData) {
                presentYAxisData.push(exportDP.chartData[key].e);
                previousYAxisData.push(exportDP.chartData[key].pe);
            }
            if (presentYAxisData.length > 0) {
                this.exportDpChartloaded = false;
            }
            else if (exportDP.chartData) {
                this.exportDpChartloaded = false;
            }
            return {
                series: [
                    {
                        name: "present",
                        data: presentYAxisData,
                    },
                    {
                        name: "Previous",
                        data: previousYAxisData
                    }
                ]
            };
        },
        purgeDpChart: function() {
            this.purgeDpChartloaded = true;
            var purgeDp = this.$store.getters["countlyConsentManager/_purgeDP"];
            var purgeDpPresent = [];
            var purgeDpPrevious = [];
            for (var key in purgeDp.chartData) {
                purgeDpPresent.push(purgeDp.chartData[key].p);
                purgeDpPrevious.push(purgeDp.chartData[key].pp);
            }
            if (purgeDpPresent.length > 0) {
                this.purgeDpChartloaded = false;
            }
            else if (purgeDp.chartData) {
                this.purgeDpChartloaded = false;
            }
            var data = {
                series: [
                    {
                        name: "present",
                        data: purgeDpPresent,
                    },
                    {
                        name: "Previous",
                        data: purgeDpPrevious,
                    },
                ]
            };
            return data;
        },
        userDatalegend: function() {
            var data = this.$store.getters["countlyConsentManager/_ePData"];
            if (data.e) {
                data.e.title = this.i18n("consent.userdata-exports");
                data.p.title = this.i18n("consent.userdata-purges");
                var legendData = {
                    name: data.e.title,
                    label: data.e.title,
                    value: data.e.total,
                    percentage: data.e.change,
                    trend: data.e.trend,
                    class: data.e.trend === 'u' ? 'cly-trend-up' : 'cly-trend-down'
                };
                return legendData;
            }
            return {};
        },
        purgeDatalegend: function() {
            var data = this.$store.getters["countlyConsentManager/_ePData"];
            if (data.e) {
                data.e.title = this.i18n("consent.userdata-exports");
                data.p.title = this.i18n("consent.userdata-purges");
                var legendData = {
                    name: data.p.title,
                    label: data.p.title,
                    value: data.e.total,
                    percentage: data.p.change,
                    trend: data.p.trend,
                    class: data.p.trend === 'u' ? 'cly-trend-up' : 'cly-trend-down'
                };
                return legendData;
            }
            return {};
        }
    },
    methods: {
        dateChanged: function() {
            this.consentDpChartloaded = true;
            this.exportDpChartloaded = true;
            this.purgeDpChartloaded = true;
            this.initializeStoreData();
        },
        formatTableNumber: function(data) {
            if (Math.abs(data) >= 10000) {
                return this.getShortNumber(data);
            }
            else {
                return this.formatNumber(data);
            }
        },
        initializeStoreData: function() {
            this.chartLoading = false;
            var newValue = this.selectedfilter0;
            if (this.selectedfilter0 === 'all') {
                newValue = "";
            }
            var self = this;
            countlyConsentManager.initialize().then(function() {
                var payload = {
                    "segment": newValue
                };
                self.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
                self.$store.dispatch("countlyConsentManager/_consentDP", payload);
                self.$store.dispatch("countlyConsentManager/_exportDP", payload);
                self.$store.dispatch("countlyConsentManager/_purgeDP");
                self.$store.dispatch("countlyConsentManager/_ePData");
            });
        },
    }
};
</script>
