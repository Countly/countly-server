<template>
    <div class="cly-vue-metric-card bu-column bu-is-flex" :data-test-id="'metric-card-' + testId + '-column'" :class="topClasses" :style="metricStyles">
        <div class="cly-vue-metric-card__wrapper bu-p-5 bu-is-flex bu-is-justify-content-space-between has-ellipsis" :data-test-id="'metric-card-' + testId + '-column-wrapper'">
            <cly-progress-donut class="bu-pr-4 bu-is-flex" :test-id="'metric-card-' + testId + '-column'" v-if="isPercentage" :color="color" :percentage="number"></cly-progress-donut>
            <div class="bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between has-ellipsis">
                <div class="bu-is-flex bu-is-align-items-center">
                    <span :data-test-id="'metric-card-' + testId + '-column-label'" class="text-medium has-ellipsis" v-tooltip="label"><slot>{{label}}</slot></span>
                    <cly-tooltip-icon :data-test-id="'metric-card-' + testId + '-column-tooltip'" v-if="tooltip.length > 0" class="bu-is-flex-grow-1 bu-ml-1" :tooltip="tooltip"></cly-tooltip-icon>
                </div>
                <div :class="numberClasses">
                    <h2 :data-test-id="'metric-card-' + testId + '-column-number'" v-if="isEstimate" v-tooltip="estimateTooltip" class="is-estimate">~<slot name="number">{{formattedNumber}}</slot></h2>
                    <h2 :data-test-id="'metric-card-' + testId + '-column-number'" v-else><slot name="number">{{formattedNumber}}</slot></h2>
                    <div class="bu-pl-2 bu-is-flex-grow-1" :data-test-id="'metric-card-' + testId + '-description'"><slot name="description"><span :data-test-id="'metric-card-' + testId + '-column-description'" class="text-medium">{{description}}</span></slot></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import countlyCommon from '../../countly/countly.common.js';

export default {
    props: {
        label: { type: String, default: '' },
        number: { type: Number, default: 0 },
        description: { type: String, default: '' },
        formatting: { type: String, default: 'auto' },
        isPercentage: { type: Boolean, default: false },
        columnWidth: { type: [Number, String], default: -1 },
        isVertical: { type: Boolean, default: false },
        color: { type: [String, Function, Array], default: '' },
        numberClasses: { type: String, default: 'bu-is-flex bu-is-align-items-baseline' },
        boxType: { type: Number, default: -1 },
        tooltip: { type: String, default: '' },
        testId: { type: String, default: "cly-metric-card-test-id" },
        isEstimate: { type: Boolean, default: false },
        estimateTooltip: { type: String, default: '' }
    },
    computed: {
        formattedNumber: function() {
            if (this.isNumberSlotUsed) {
                return '';
            }

            if (this.formatting === 'auto') {
                if (this.isPercentage) {
                    return this.number + "%";
                }
                else if (Math.abs(this.number) >= 10000) {
                    return countlyCommon.getShortNumber(this.number);
                }
                else {
                    return countlyCommon.formatNumber(this.number);
                }
            }
            else if (this.formatting === 'short') {
                return countlyCommon.getShortNumber(this.number);
            }
            else if (this.formatting === 'long') {
                return countlyCommon.formatNumber(this.number);
            }

            return this.number;
        },
        isDescriptionSlotUsed: function() {
            return !!this.$slots.description;
        },
        isNumberSlotUsed: function() {
            return !!this.$slots.number;
        },
        topClasses: function() {
            if (this.isVertical || this.columnWidth === -1) {
                return "";
            }

            return "bu-is-" + this.columnWidth;
        },
        metricStyles: function() {
            var classes = "";
            if (this.boxType === 3) {
                classes = "min-width: 33%";
            }
            else if (this.boxType === 4) {
                classes = "min-width: 25%";
            }
            else if (this.boxType === 5) {
                classes = "min-width: 20%";
            }
            return classes;
        }
    }
};
</script>
