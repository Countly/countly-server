<template>
    <div class="bu-column bu-columns crashes-tile" :class="classes">
        <slot>
            <div class="bu-is-flex bu-is-align-items-center" style="width: 100%;">
                <div class="crashes-tile__donut">
                    <cly-progress-donut :percentage="donutPercentage" :color="donutColor" v-if="showDonut"></cly-progress-donut>
                </div>
                <div class="crashes-tile__content">
                    <div class="text-medium color-cool-gray-100 bu-mb-1" :data-test-id="testId + '-title'"><slot name="title"></slot> <cly-tooltip-icon :data-test-id="testId + '-tooltip'" v-if="hasTooltip" :tooltip="tooltip" icon="ion ion-help-circled"></cly-tooltip-icon></div>
                    <div class="bu-columns bu-is-gapless bu-is-mobile bu-is-flex-wrap-nowrap bu-is-justify-content-flex-start bu-is-align-items-center">
                        <div class="crashes-tile__value-container bu-column bu-mr-2" >
                            <h2 class="color-cool-gray-100" :data-test-id="testId + '-value'"><slot name="value"></slot></h2>
                        </div>
                        <div class="crashes-tile__description-container bu-column" v-if="hasDescription">
                            <div class="text-button color-cool-gray-100" :data-test-id="testId + '-description'">
                                <slot name="description"></slot>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </slot>
    </div>
</template>

<script>
import ClyProgressDonut from '../../../../../frontend/express/public/javascripts/components/progress/progress-donut.vue';
import ClyTooltipIcon from '../../../../../frontend/express/public/javascripts/components/helpers/cly-tooltip-icon.vue';

export default {
    components: {
        ClyProgressDonut,
        ClyTooltipIcon
    },
    props: {
        showDonut: {type: Boolean, default: false},
        donutPercentage: {type: Number, default: 50},
        donutColor: {type: String, default: "#ff6120"},
        isVertical: {type: Boolean, default: false},
        columnWidth: {type: [Number, String], default: 4},
        tooltip: {type: String},
        testId: {type: String, default: "cly-crashes-dashboard-tile-default-test-id"}
    },
    computed: {
        classes: function() {
            return this.$props.isVertical ? ["crashes-tile--vertical"] : ["crashes-tile--horizontal", "bu-is-" + this.$props.columnWidth];
        },
        hasDescription: function() {
            return !!this.$slots.description;
        },
        hasTooltip: function() {
            return !!this.$props.tooltip;
        }
    }
};
</script>
