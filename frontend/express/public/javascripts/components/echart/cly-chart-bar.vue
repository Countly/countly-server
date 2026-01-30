<template>
    <div class="cly-vue-chart" :class="chartClasses" :style="chartStyles" :data-test-id="testId + '-chart'">
        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">
            <cly-chart-header
                :chart-type="'bar'"
                ref="header"
                v-if="!isChartEmpty"
                :test-id="testId"
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
            <div :class="[isChartEmpty && 'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center', 'bu-is-flex-grow-1']" style="min-height: 0">
                <echarts
                    v-if="!isChartEmpty"
                    :updateOptions="echartUpdateOptions"
                    ref="echarts"
                    v-bind="$attrs"
                    v-on="$listeners"
                    :option="chartOptions"
                    :autoresize="autoresize"
                    @finished="onChartFinished"
                    @datazoom="onDataZoom"
                    @click="onClick">
                </echarts>
                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">
                    <cly-empty-chart :test-id="testId" :classes="{'bu-py-0': true}"></cly-empty-chart>
                </div>
            </div>
        </div>
        <cly-custom-legend
            ref="legend"
            :options="legendOptions"
            :seriesType="seriesType"
            :testId="testId"
            v-if="legendOptions.show && !isChartEmpty">
        </cly-custom-legend>
    </div>
</template>

<script>
import { mergeWith as _mergeWith } from 'lodash';
import countlyVue from '../../countly/vue/core.js';
import { LegendMixin, ZoomMixin, UpdateOptionsMixin, EventsMixin, GraphNotesMixin, xAxisOverflowHandler } from './mixins.js';
import { BaseChartMixin } from './chart-options.js';
import ClyChartHeader from './cly-chart-header.vue';
import ClyCustomLegend from './cly-custom-legend.vue';

export default {
    mixins: [
        BaseChartMixin,
        LegendMixin,
        ZoomMixin,
        UpdateOptionsMixin,
        EventsMixin,
        GraphNotesMixin,
        xAxisOverflowHandler,
        countlyVue.mixins.autoRefresh
    ],
    components: {
        'cly-chart-header': ClyChartHeader,
        'cly-custom-legend': ClyCustomLegend
    },
    props: {
        patchXAxis: {
            type: Boolean,
            default: true,
            required: false
        },
        testId: {
            type: String,
            default: "cly-chart-bar-test-id",
            required: false
        },
        hideNotation: {
            type: Boolean,
            default: true,
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
            mixinOptions: {},
            seriesOptions: {
                type: 'bar',
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
                }
            }
        };
    },
    computed: {
        mergedOptions: function() {
            var opt = _mergeWith({}, this.baseOptions, this.mixinOptions, this.option);
            var series = opt.series || [];

            for (var i = 0; i < series.length; i++) {
                series[i] = _mergeWith({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
            }

            this.setCalculatedLegendData(opt, series);

            opt.series = series;

            if (this.legendOptions.position !== "bottom") {
                opt.grid.right = 0;
            }

            return opt;
        },
        chartOptions: function() {
            var opt = _mergeWith({}, this.mergedOptions);
            opt = this.patchChart(opt);
            if (this.patchXAxis) {
                opt = this.patchOptionsForXAxis(opt);
            }
            return opt;
        }
    },
    methods: {
        refresh: function() {
            if (!this.areNotesHidden) {
                this.getGraphNotes();
            }
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
