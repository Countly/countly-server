<template>
    <div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">
        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">
            <cly-chart-header
                ref="header"
                :chart-type="'pie'"
                v-if="!isChartEmpty"
                @series-toggle="onSeriesChange"
                :show-zoom="showZoom"
                :show-toggle="showToggle"
                :show-download="showDownload">
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
                    @datazoom="onDataZoom">
                </echarts>
                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">
                    <cly-empty-chart :classes="{'bu-py-0': true}"></cly-empty-chart>
                </div>
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
    computed: {
        chartOptions: function() {
            var opt = _mergeWith({}, this.baseOptions, this.option);
            opt = this.patchChart(opt);
            return opt;
        }
    }
};
</script>
