<template>
    <div v-bind:class="['bu-level-item','cly-vue-push-notification-large-radio-button-with-description__container','bu-pr-1']">
        <el-radio :style="{height: calculatedHeight, width: '100%'}" :label="label"  border class="cly-vue-push-notification-large-radio-button-with-description__button" v-model="innerValue">
            <div class="cly-vue-push-notification-large-radio-button-with-description__title bu-mt-2">
            <span>{{title}}</span>
            <cly-tooltip-icon
                v-if="tooltip"
                style="margin-bottom: 1px"
                :tooltip="tooltip"
                icon="ion ion-help-circled">
            </cly-tooltip-icon>
            </div>
            <div class="cly-vue-push-notification-large-radio-button-with-description__content bu-level bu-is-justify-content-flex-start bu-is-align-items-baseline bu-ml-5 bu-mt-2 font-weight-normal">
                <slot v-if="hasDefaultSlot"></slot>
                <template v-if="description"><span>{{description}}</span></template>
            </div>
        </el-radio>
    </div>
</template>

<script>
export default {
    props: {
        value: {
            type: [String, Boolean],
            required: true
        },
        label: {
            type: [String, Boolean],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        tooltip: {
            type: String,
            required: false,
        },
        size: {
            type: String,
            default: 'medium',
            required: false
        }
    },
    data: function() {
        return {};
    },
    computed: {
        innerValue: {
            get: function() {
                return this.value;
            },
            set: function(value) {
                this.$emit('input', value);
            }
        },
        hasDefaultSlot: function() {
            return Boolean(this.$slots.default);
        },
        calculatedHeight() {
            if (this.size === 'small') {
                return '60px';
            }
            else if (this.size === 'large') {
                return '110px';
            }
            else {
                return '97px';
            }
        }
    }
};
</script>
