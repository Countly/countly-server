<template>
    <div class="bu-level bu-mb-4 bu-is-justify-content-flex-start bu-is-align-items-flex-start">
        <div class="bu-is-flex-grow-0 bu-is-justify-content-flex-start cly-vue-push-notification-details-summary__label">
            {{label}}
        </div>
        <div class="bu-is-justify-content-flex-start cly-vue-push-notification-details-summary__value" v-if="value">
            <template v-if="label && label.length && label.toLowerCase().includes('url') && value.length > 1">
                <a class="color-blue-100 font-weight-bold" :href="value" target="_blank">{{ value }}</a>
            </template>
            <template v-else>
                <component :is="usePre ? 'pre' : 'div'">{{ value }}</component>
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
            default: false,
        }
    },
    computed: {
        hasDefaultSlot: function() {
            return Boolean(this.$slots.default);
        }
    }
};
</script>
