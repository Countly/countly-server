<template>
    <div :class="topClasses">
        <el-progress
            :data-test-id="'el-progress-' + testId"
            :color="color"
            :percentage="percentage"
            type="circle"
            :width="56"
            stroke-linecap="butt"
            :stroke-width="9"
            :show-text="false"
        ></el-progress>
        <div
            v-if="mode === 'advanced-tile'"
            class="bu-pl-5 bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between"
        >
            <span class="text-medium" :data-test-id="'el-progress-label-' + testId">
                <slot>{{ label }}</slot>
            </span>
            <h2 :data-test-id="'el-progress-percentage-' + testId">{{ percentage }} %</h2>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        percentage: {
            type: Number,
            default: 42
        },
        color: {
            type: [String, Function, Array],
            default: '#00C3CA'
        },
        mode: {
            type: String,
            default: 'simple',
            validator: function(val) {
                return val === 'simple' || val === 'advanced-tile';
            }
        },
        label: {
            type: String,
            required: false,
            default: ''
        },
        testId: {
            type: String,
            required: false,
            default: 'test-id'
        }
    },
    computed: {
        topClasses: function() {
            if (this.mode === 'advanced-tile') {
                return 'bu-p-5 bu-is-flex';
            }
            return '';
        }
    }
};
</script>
