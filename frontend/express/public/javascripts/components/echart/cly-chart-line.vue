<template>
    <div class="cly-vue-chart" :class="chartClasses" :style="chartStyles" :data-test-id="testId + '-chart'">
        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">
            <cly-chart-header
                :test-id="testId + '-header'"
                :chart-type="'line'"
                :category="category"
                :hide-notation="hideNotation"
                ref="header"
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
            <div :class="[isChartEmpty && 'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center', 'bu-is-flex-grow-1']" style="min-height: 0">
                <echarts
                    v-if="!isChartEmpty"
                    :updateOptions="echartUpdateOptions"
                    ref="echarts"
                    v-bind="$attrs"
                    v-on="$listeners"
                    :option="chartOptions"
                    @click="onClick"
                    :autoresize="autoresize"
                    @finished="onChartFinished"
                    @datazoom="onDataZoom">
                </echarts>
                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">
                    <cly-empty-chart :test-id="testId" :classes="{'bu-py-0': true}"></cly-empty-chart>
                </div>
            </div>
        </div>
        <cly-custom-legend
            ref="legend"
            :test-id="testId + '-legend'"
            :options="legendOptions"
            :seriesType="seriesType"
            v-if="legendOptions.show && !isChartEmpty">
        </cly-custom-legend>
    </div>
</template>

<script>
import { mergeWith as _mergeWith } from 'lodash';
import countlyVue from '../../countly/vue/core.js';
import { LegendMixin, ZoomMixin, UpdateOptionsMixin, EventsMixin, GraphNotesMixin, xAxisOverflowHandler, mergeWithCustomizer } from './mixins.js';
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
        xAxisOverflowHandler,
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
        },
        hideNotation: {
            type: Boolean,
            default: false,
            required: false
        },
        testId: {
            type: String,
            default: 'cly-chart-line-default-test-id',
            required: false
        }
    },
    data: function() {
        return {
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

            opt = this.patchChart(opt);
            opt = this.patchOptionsForXAxis(opt);
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
