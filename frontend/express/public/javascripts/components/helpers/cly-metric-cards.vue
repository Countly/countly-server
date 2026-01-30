<template>
    <div :class="topClasses" class="cly-vue-metric-cards bu-columns bu-is-gapless bu-is-mobile">
        <slot></slot>
    </div>
</template>

<script>
export default {
    props: {
        multiline: {
            type: Boolean,
            default: true,
            required: false
        },
        isSyncedScroll: {
            type: Boolean,
            default: false,
            required: false
        }
    },
    computed: {
        topClasses: function() {
            if (this.multiline) {
                return ["cly-vue-metric-cards--is-multiline", "bu-is-multiline"];
            }
            if (this.isSyncedScroll) {
                return "is-synced";
            }
        }
    }
};
</script>
