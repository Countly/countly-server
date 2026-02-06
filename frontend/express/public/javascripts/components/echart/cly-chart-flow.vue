<template>
    <div class="cly-vue-chart" :class="chartClasses">
        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">
            <cly-chart-header
                ref="header"
                :chart-type="'flow'"
                v-if="!isChartEmpty"
                @series-toggle="onSeriesChange"
                :show-zoom="showZoom"
                :show-toggle="showToggle"
                :show-download="showDownload">
                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">
                    <slot :name="item" v-bind="slotScope"></slot>
                </template>
            </cly-chart-header>
            <div class="chart-wrapper" :style="{height: (chartOptions.chartheight) + 'px'}">
                <vue-scroll :ops="scrollOptions">
                    <div :class="[isChartEmpty && 'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center']" :style="{'min-width':'100%',height: (chartOptions.chartheight) + 'px', width: chartOptions.chartwidth + 'px'}">
                        <echarts
                            v-if="!isChartEmpty"
                            :updateOptions="echartUpdateOptions"
                            ref="echarts"
                            v-bind="$attrs"
                            v-on="$listeners"
                            :option="chartOptions"
                            :autoresize="autoresize"
                            @datazoom="onDataZoom">
                        </echarts>
                        <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">
                            <cly-empty-chart :classes="{'bu-py-0': true}"></cly-empty-chart>
                        </div>
                    </div>
                </vue-scroll>
            </div>
        </div>
        <cly-custom-legend
            ref="legend"
            :options="legendOptions"
            :seriesType="seriesType"
            v-if="legendOptions.show && !isChartEmpty">
        </cly-custom-legend>
    </div>
</template>

<script>
import { mergeWith as _mergeWith } from 'lodash';
import { LegendMixin, ZoomMixin, UpdateOptionsMixin, EventsMixin } from './mixins.js';
import { BaseChartMixin } from './chart-options.js';
import ClyChartHeader from './cly-chart-header.vue';
import ClyCustomLegend from './cly-custom-legend.vue';
import vuescroll from 'vuescroll';

export default {
    mixins: [
        BaseChartMixin,
        LegendMixin,
        ZoomMixin,
        UpdateOptionsMixin,
        EventsMixin
    ],
    components: {
        'cly-chart-header': ClyChartHeader,
        'cly-custom-legend': ClyCustomLegend,
        'vue-scroll': vuescroll
    },
    data: function() {
        return {
            forwardedSlots: ["chart-left", "chart-right", "chart-header-left-input"],
            scrollOptions: {
                vuescroll: {},
                scrollPanel: {
                    scrollingY: false
                },
                rail: {
                    gutterOfSide: "1px",
                    gutterOfEnds: "15px"
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    specifyBorderRadius: "3px",
                    keepShow: true
                }
            }
        };
    },
    computed: {
        chartOptions: function() {
            var ops = _mergeWith({}, this.baseOptions, this.option);
            delete ops.grid;
            delete ops.xAxis;
            delete ops.yAxis;

            ops = this.patchChart(ops);
            return ops;
        }
    }
};
</script>
