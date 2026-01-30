<template>
    <div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">
        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1" style="height: 100%">
            <cly-chart-header
                ref="header"
                :chart-type="'pie'"
                v-if="!isChartEmpty"
                :test-id="testId"
                @series-toggle="onSeriesChange"
                :show-zoom="showZoom"
                :show-toggle="showToggle"
                :show-download="showDownload">
                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">
                    <slot :name="item" v-bind="slotScope"></slot>
                </template>
            </cly-chart-header>
            <div :class="[isChartEmpty && 'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center', 'bu-columns bu-is-gapless bu-is-flex-grow-1']" style="min-height: 0;">
                <div :class="classes">
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
                </div>
                <cly-custom-legend
                    ref="legend"
                    :options="pieLegendOptions"
                    :seriesType="seriesType"
                    v-if="pieLegendOptions.show && !isChartEmpty && !hasAllEmptyValues"
                    :class="classes" class="shadow-container">
                </cly-custom-legend>
                <div v-if="!isChartEmpty && hasAllEmptyValues" :class="classes" class="shadow-container">
                    <div class="cly-vue-chart-legend__secondary">
                        <div style="height: 100%; display: flex; flex-direction: column; justify-content: center;">
                            <div class="bu-p-4">{{$i18n("common.bar.no-data")}}</div>
                        </div>
                    </div>
                </div>
                <div class="bu-column bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">
                    <cly-empty-chart :test-id="testId" :classes="{'bu-py-0': true}"></cly-empty-chart>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { mergeWith as _mergeWith } from 'lodash';
import { LegendMixin, ZoomMixin, UpdateOptionsMixin, EventsMixin } from './mixins.js';
import { BaseChartMixin } from './chart-options.js';
import ClyChartHeader from './cly-chart-header.vue';
import ClyCustomLegend from './cly-custom-legend.vue';

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
        'cly-custom-legend': ClyCustomLegend
    },
    props: {
        showZoom: {
            type: Boolean,
            default: false
        },
        showDownload: {
            type: Boolean,
            default: false
        },
        testId: {
            type: String,
            default: "cly-chart-pie-test-id",
            required: false
        }
    },
    data: function() {
        return {
            mixinOptions: {
                legend: {
                    orient: 'vertical',
                    right: "25%",
                    top: "25%",
                    bottom: 'auto',
                    show: false
                },
                tooltip: {
                    trigger: 'item',
                    position: function(point, params, dom, rect, size) {
                        if (size.contentSize[0] + 110 >= size.viewSize[0]) {
                            return [point[0] + 30, point[1] + 30];
                        }
                    }
                },
                xAxis: {
                    show: false
                },
                yAxis: {
                    show: false
                }
            },
            seriesOptions: {
                type: 'pie',
                radius: ['50%', '80%'],
                center: ['50%', '50%'],
                itemStyle: {
                    borderRadius: 0,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: true,
                    position: "center",
                    overflow: "breakAll",
                    lineOverflow: "truncate",
                    fontSize: 14,
                    lineHeight: 18
                }
            }
        };
    },
    computed: {
        hasAllEmptyValues: function() {
            var options = this.mergedOptions;
            if (options.series) {
                for (var i = 0; i < options.series.length; i++) {
                    if (!options.series[i].isEmptySeries) {
                        return false;
                    }
                }
            }
            return true;
        },
        mergedOptions: function() {
            var opt = _mergeWith({}, this.baseOptions, this.mixinOptions, this.option);
            var series = opt.series || [];

            var sumOfOthers;
            var seriesArr;

            for (var i = 0; i < series.length; i++) {
                seriesArr = [];
                sumOfOthers = 0;

                series[i] = _mergeWith({}, this.baseSeriesOptions, this.seriesOptions, series[i]);

                series[i].data = series[i].data.filter(function(el) {
                    return el.value > 0;
                });
                if (series[i].data.length === 0) {
                    series[i].isEmptySeries = true;
                    series[i].data.push({"label": "empty", "value": 100});
                    opt.legend.show = false;
                    opt.tooltip.show = false;
                    series[i].color = "#ECECEC";
                    series[i].name = "empty";
                    series[i].emphasis = {
                        itemStyle: {
                            color: "#ECECEC"
                        }
                    };
                }

                var seriesData = series[i].data;
                seriesData.sort(function(a, b) {
                    return b.value - a.value;
                });

                if (seriesData.length > 12) {
                    for (var k = 12; k < seriesData.length; k++) {
                        sumOfOthers += seriesData[k].value;
                    }
                    seriesArr = seriesData.slice(0, 12);
                    seriesArr.push({value: sumOfOthers, name: 'Others'});
                    series[i].data = seriesData = seriesArr;
                }
            }

            this.setCalculatedLegendData(opt, series);

            opt.series = series;

            return opt;
        },
        chartOptions: function() {
            var opt = _mergeWith({}, this.mergedOptions);
            opt = this.patchChart(opt);
            return opt;
        },
        classes: function() {
            var classes = {
                "bu-column": true
            };

            if (this.legendOptions.show) {
                classes["bu-is-half"] = true;
            }
            else {
                classes["bu-is-full"] = true;
            }

            return classes;
        },
        pieLegendOptions: function() {
            var opt = _mergeWith({}, this.legendOptions);
            opt.type = "secondary";
            opt.chartType = "pie";

            if (opt.position === "bottom") {
                opt.position = "right";
            }

            return opt;
        }
    }
};
</script>
