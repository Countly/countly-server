<template>
    <div>
        <div class="cly-vue-compare-events__header bu-is-flex">
            <h2 data-test-id="header-title"> {{i18n('compare.events.title')}}
            </h2>
        </div>
        <cly-main>
            <div class="bu-mb-4 cly-vue-compare-events">
                <el-select
                    test-id="select-events-to-compare"
                    style="width:620px"
                    v-model="value"
                    multiple
                    popper-class="cly-vue-compare-apps__compare__width"
                    filterable
                    default-first-option
                    :multiple-limit="maxLimit"
                    placeholder="Select maximum 20 events to compare"
                >
                    <el-option
                        v-for="item in allEventsList"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    >
                    </el-option>
                </el-select>
                <el-button
                    data-test-id="events-compare-button"
                    :disabled="value.length===0"
                    @click="compareEvents"
                    class="cly-vue-compare-events__button"
                    size="small"
                >{{i18n('compare.events')}}
                </el-button>
            </div>
            <div class="bu-pt-4 bu-mb-4">
                <cly-date-picker-g class="cly-vue-events-all-date-picker"></cly-date-picker-g>
            </div>
            <div class="bu-pt-3 bu-mb-5">
                <span
                    class="text-big font-weight-bold bu-pr-2"
                    data-test-id="compare-events-results-by-label"
                >{{i18n('compare.results.by')}}</span>
                <el-select
                    test-id="compare-events-results-by-button"
                    :arrow="false"
                    :adaptiveLength="true"
                    v-model="selectedGraph"
                >
                    <el-option
                        v-for="item in availableMetrics"
                        :key="item.key"
                        :value="item.key"
                        :label="item.label"
                    >
                    </el-option>
                </el-select>
            </div>
            <cly-section>
                <div>
                    <cly-chart-time
                        test-id="compare-events-chart-time"
                        :option="lineChartData"
                        :legend="lineLegend"
                        :force-loading="isChartLoading"
                        :val-formatter="formatChartValue"
                        v-loading="isChartLoading"
                        category="events"
                    ></cly-chart-time>
                </div>
            </cly-section>
            <cly-section>
                <detail-tables></detail-tables>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import CompareEventsTable from './CompareEventsTable.vue';

export default {
    mixins: [countlyVue.mixins.i18n, autoRefreshMixin],
    components: {
        "detail-tables": CompareEventsTable,
    },
    methods: {
        compareEvents: function() {
            this.$store.dispatch('countlyCompareEvents/setTableLoading', true);
            this.$store.dispatch('countlyCompareEvents/setChartLoading', true);
            this.$store.dispatch('countlyCompareEvents/fetchSelectedEvents', this.value);
            this.$store.dispatch('countlyCompareEvents/fetchCompareEventsData');
        },
        refresh: function() {
            var selectedEvents = this.$store.getters["countlyCompareEvents/selectedEvents"];
            if (selectedEvents.length > 0) {
                this.$store.dispatch('countlyCompareEvents/fetchRefreshCompareEventsData');
            }
        },
        dateChanged: function() {
            this.$store.dispatch('countlyCompareEvents/setTableLoading', true);
            this.$store.dispatch('countlyCompareEvents/setChartLoading', true);
            this.$store.dispatch('countlyCompareEvents/fetchCompareEventsData', this.value);
        },
        formatChartValue: function(value) {
            if (["Duration", "AvgDuration"].includes(this.selectedMetric)) {
                return countlyCommon.formatSecond(value);
            }
            return countlyCommon.getShortNumber(value);
        }
    },
    computed: {
        allEventsList: function() {
            return this.$store.getters["countlyCompareEvents/allEventsList"];
        },
        lineChartData: function() {
            return this.$store.getters["countlyCompareEvents/lineChartData"];
        },
        lineLegend: function() {
            return this.$store.getters["countlyCompareEvents/lineLegend"];
        },
        selectedGraph: {
            get: function() {
                var self = this;
                var metric = this.availableMetrics.find(function(item) {
                    return item.key === self.selectedMetric;
                });
                return metric.label || this.i18n("compare.events.results.by.count");
            },
            set: function(selectedItem) {
                this.$store.dispatch('countlyCompareEvents/setTableLoading', true);
                this.$store.dispatch('countlyCompareEvents/setChartLoading', true);
                var selectedEvents = this.$store.getters["countlyCompareEvents/selectedEvents"];
                var metric = this.availableMetrics.find(function(item) {
                    return item.key === selectedItem;
                });
                metric = metric || this.availableMetrics[0];

                this.selectedMetric = metric.key;
                this.$store.dispatch('countlyCompareEvents/fetchSelectedGraphMetric', metric.graphMetric);
                this.$store.dispatch('countlyCompareEvents/fetchLineChartData', selectedEvents);
            }
        },
        isChartLoading: function() {
            return this.$store.getters["countlyCompareEvents/isChartLoading"];
        }
    },
    data: function() {
        return {
            value: "",
            maxLimit: 20,
            availableMetrics: [
                { key: "Count", label: this.i18n("compare.events.results.by.count"), graphMetric: "c"},
                { key: "Sum", label: this.i18n("compare.events.results.by.sum"), graphMetric: "s"},
                { key: "Duration", label: this.i18n("compare.events.results.by.duration"), graphMetric: "dur"},
                { key: "AvgDuration", label: this.i18n("compare.events.results.by.avg.duration"), graphMetric: "avgDur"}
            ],
            selectedMetric: "Count"
        };
    },
    beforeCreate: function() {
        this.$store.dispatch('countlyCompareEvents/fetchAllEventsData');
    }
};
</script>
