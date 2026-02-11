<template>
    <div class="bu-level bu-my-2 bu-is-justify-content-flex-start bu-is-align-items-flex-start">
        <div class="bu-is-flex-grow-0 bu-is-justify-content-flex-start cly-vue-push-notification-review-section-row__label">
            {{label}}
        </div>
        <div class="bu-is-justify-content-flex-start cly-vue-push-notification-review-section-row__value">
            <template v-if="value">
                <component :is="usePre?'pre':'div'">{{value}} </component>
            </template>
            <slot v-if="hasDefaultSlot"></slot>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        value: {
            type: [String, Number],
            default: ""
        },
        label: {
            type: String,
            default: ""
        },
        usePre: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        hasDefaultSlot: function() {
            return Boolean(this.$slots.default);
        }
    }
};
</script>
