<template>
    <div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">
        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">
            <cly-chart-header
                :test-id="testId + '-header'"
                ref="header"
                :chart-type="chartType"
                :category="category"
                :hide-notation="hideNotation"
                v-if="!isChartEmpty"
                @series-toggle="onSeriesChange"
                :show-zoom="showZoom"
                :show-toggle="showToggle"
                :show-download="showDownload"
                @graph-notes-refresh="refresh"
                @notes-visibility="notesVisibility">
                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">
                    <slot :name="item" v-bind="slotScope"></slot>
                </template>
            </cly-chart-header>
            <div :data-test-id="testId + '-chart'" :class="[isChartEmpty && 'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center', 'bu-is-flex-grow-1']" style="min-height: 0">
                <echarts
                    v-if="!isChartEmpty"
                    :updateOptions="echartUpdateOptions"
                    ref="echarts"
                    v-bind="$attrs"
                    v-on="$listeners"
                    :option="chartOptions"
                    @click="onClick"
                    :autoresize="autoresize"
                    @datazoom="onDataZoom"/>
                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">
                    <cly-empty-chart :test-id="testId" :classes="{'bu-py-0': true}"></cly-empty-chart>
                </div>
            </div>
        </div>
        <cly-custom-legend
            :test-id="testId + '-legend'"
            ref="legend"
            :options="legendOptions"
            :seriesType="seriesType"
            v-if="legendOptions.show && !isChartEmpty">
        </cly-custom-legend>
    </div>
</template>

<script>
import { mergeWith as _mergeWith } from 'lodash';
import moment from 'moment';
import { countlyCommon, CommonConstructor } from '../../countly/countly.common.js';
import countlyVue from '../../countly/vue/core.js';
import { LegendMixin, ZoomMixin, UpdateOptionsMixin, EventsMixin, GraphNotesMixin, mergeWithCustomizer } from './mixins.js';
import { BaseChartMixin } from './chart-options.js';
import ClyChartHeader from './cly-chart-header.vue';
import ClyCustomLegend from './cly-custom-legend.vue';
// TO-DO: dependency window.hideGraphTooltip will be imported

export default {
    mixins: [
        BaseChartMixin,
        LegendMixin,
        ZoomMixin,
        UpdateOptionsMixin,
        EventsMixin,
        GraphNotesMixin,
        countlyVue.mixins.autoRefresh
    ],
    components: {
        'cly-chart-header': ClyChartHeader,
        'cly-custom-legend': ClyCustomLegend
    },
    props: {
        showToggle: {
            type: Boolean,
            default: true
        },
        bucket: {
            type: String,
            validator: function(value) {
                return ['hourly', 'daily', 'weekly', 'monthly'].indexOf(value) !== -1;
            }
        },
        dummy: {
            type: Boolean
        },
        period: {
            type: [Array, String]
        },
        hideNotation: {
            type: Boolean,
            default: false,
            required: false
        },
        noHourly: {
            type: Boolean,
            default: false,
            required: false
        },
        testId: {
            type: String,
            default: 'cly-chart-time-default-test-id',
            required: false
        },
        category: {
            type: String,
            required: false,
            default: ''
        },
        subCategory: {
            type: Array,
            required: false,
            default: function() {
                return [];
            }
        },
        notationSelectedBucket: {
            type: String,
            required: false,
            default: "weekly"
        }
    },
    data: function() {
        return {
            chartType: 'line',
            mixinOptions: {},
            seriesOptions: {
                type: 'line',
                markPoint: {
                    data: [],
                    label: {
                        normal: {
                            show: true,
                            color: "rgba(255, 251, 251, 1)",
                            fontWeight: "500",
                            align: "center",
                            padding: [1, 1, 1, 2],
                        },
                    },
                    emphasis: {
                        itemStyle: {}
                    },
                    animation: false
                },
                symbol: 'none'
            }
        };
    },
    computed: {
        mergedOptions: function() {
            var opt = _mergeWith({}, this.baseOptions, this.mixinOptions, this.option, mergeWithCustomizer);
            var series = opt.series || [];
            for (var i = 0; i < series.length; i++) {
                series[i] = _mergeWith({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
            }
            this.setCalculatedLegendData(opt, series);

            opt.series = series;

            if (this.legendOptions.position !== "bottom") {
                opt.grid.right = 0;
            }

            if (typeof window.hideGraphTooltip !== "undefined") {
                window.hideGraphTooltip();
            }

            return opt;
        },
        chartOptions: function() {
            if (this.mergedOptions && this.mergedOptions.series && this.mergedOptions.series.length > 1) {
                for (var index = 1; index < this.mergedOptions.series.length; index++) {
                    delete this.mergedOptions.series[index].markPoint;
                }
            }
            var opt = _mergeWith({}, this.mergedOptions);

            var xAxisData = [];
            if (!opt.xAxis.data) {
                var period = (this.period && this.period.length) ? this.period : countlyCommon.getPeriod();

                var chartsCommon = new CommonConstructor();
                chartsCommon.setPeriod(period, undefined, true);

                var tickObj = {};

                if (period === "month" && this.category !== "active-users" && !this.bucket) {
                    tickObj = chartsCommon.getTickObj("monthly", false, true);
                }
                else if (countlyCommon.periodObj.numberOfDays === 1 && this.noHourly) {
                    tickObj = {
                        ticks: [[0, countlyCommon.formatDate(moment((countlyCommon.periodObj.activePeriod).replace(/\./g, "/"), "YYYY/MM/DD"), "D MMM")]],
                        tickTexts: [countlyCommon.formatDate(moment((countlyCommon.periodObj.activePeriod).replace(/\./g, "/"), "YYYY/MM/DD"), "D MMM")]
                    };
                }
                else {
                    tickObj = chartsCommon.getTickObj(this.bucket, false, true);
                }

                var ticks = tickObj.ticks;
                for (var i = 0; i < ticks.length; i++) {
                    var tick = ticks[i];
                    var tickIndex = tick[0];
                    var tickValue = tick[1];
                    while (xAxisData.length < tickIndex) {
                        xAxisData.push("");
                    }
                    xAxisData.push(tickValue);
                }

                opt.xAxis.data = xAxisData;
            }

            if (this.dummy) {
                var dummyData = [];
                for (var j = 0; j < xAxisData.length; j++) {
                    dummyData.push(parseInt(Math.random() * 100));
                }

                for (var k = 0; k < opt.series.length; k++) {
                    opt.series[k].data = dummyData;
                }
            }

            opt = this.patchChart(opt);

            return opt;
        }
    },
    methods: {
        refresh: function() {
            if (this.seriesOptions.type !== "line") {
                this.seriesOptions.markPoint.data = [];
            }
            else if (!this.areNotesHidden) {
                this.getGraphNotes();
            }
            this.chartType = this.seriesOptions?.type || 'line';
        },
        notesVisibility: function() {
            if (!this.areNotesHidden) {
                this.getGraphNotes();
            }
            else {
                this.seriesOptions.markPoint.data = [];
            }
        }
    }
};
</script>
