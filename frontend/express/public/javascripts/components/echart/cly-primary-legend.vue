<template>
    <div class="cly-vue-chart-legend__primary">
        <div v-for="(item, index) in data"
            :key="item.name"
            :data-series="item.name"
            :class="['cly-vue-chart-legend__p-series',
                    {'cly-vue-chart-legend__p-series--deselected': item.status === 'off'}]"
            @click="onClick(item, index)">
            <div class="cly-vue-chart-legend__first-row">
                <div class="cly-vue-chart-legend__p-checkbox" :style="{backgroundColor: item.displayColor}" :data-test-id="testId + '-' + getLegendKey(item) + '-icon'"></div>
                <div class="cly-vue-chart-legend__p-title" :data-test-id="testId + '-' + getLegendKey(item) + '-label'">{{unescapeHtml(item.label || item.name)}}</div>
                <div class="cly-vue-chart-legend__p-tooltip" v-if="item.tooltip">
                    <cly-tooltip-icon :tooltip="item.tooltip" icon="ion-help-circled" :data-test-id="testId + '-' + getLegendKey(item) + '-tooltip'"></cly-tooltip-icon>
                </div>
            </div>
            <div class="cly-vue-chart-legend__second-row">
                <div class="cly-vue-chart-legend__p-number is-estimate" v-if="item.isEstimate" v-tooltip="item.estimateTooltip" :data-test-id="testId + '-' + getLegendKey(item) + '-value'">~{{item.value}}</div>
                <div class="cly-vue-chart-legend__p-number" v-else :data-test-id="testId + '-' + getLegendKey(item) + '-value'">{{item.value}}</div>
                <div
                    :class="['cly-vue-chart-legend__p-trend',
                            {'cly-vue-chart-legend__p-trend--trend-up': item.trend === 'up'},
                            {'cly-vue-chart-legend__p-trend--trend-down': item.trend === 'down'}]"
                >
                    <i class="cly-trend-up-icon ion-android-arrow-up" v-if="item.trend === 'up'" :data-test-id="testId + '-' + getLegendKey(item) + '-trend-icon'"></i>
                    <i class="cly-trend-down-icon ion-android-arrow-down" v-if="item.trend === 'down'" :data-test-id="testId + '-' + getLegendKey(item) + '-trend-icon'"></i>
                    <span v-if="typeof item.percentage === 'number' && !isNaN(item.percentage)" :data-test-id="testId + '-' + getLegendKey(item) + '-percentage'">{{item.percentage}}%</span>
                    <span v-if="typeof item.percentage === 'string' && item.percentage.length" :data-test-id="testId + '-' + getLegendKey(item) + '-percentage'">{{item.percentage}}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import countlyVue from '../../countly/vue/core.js';

export default {
    mixins: [
        countlyVue.mixins.commonFormatters,
    ],
    props: {
        data: {
            type: Array,
            default: function() {
                return [];
            }
        },
        onClick: {
            type: Function
        },
        testId: {
            type: String,
            default: "primary-legend-test-id"
        }
    },
    methods: {
        getLegendKey: function(item) {
            var key = item.label ? item.label : item.name;
            return key.replaceAll(' ', '-').toLowerCase();
        }
    }
};
</script>
