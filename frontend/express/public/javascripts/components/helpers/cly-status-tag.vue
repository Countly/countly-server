<template>
    <div class="cly-vue-status-tag" :class="dynamicClasses">
        <div class="cly-vue-status-tag__blink" />
        <div v-if="loading" class="cly-vue-status-tag__skeleton" />
        <template v-else>{{ text }}</template>
    </div>
</template>

<script>
export default {
    props: {
        color: {
            default: 'green',
            type: String
        },
        loading: {
            default: false,
            type: Boolean
        },
        size: {
            default: 'unset',
            type: String
        },
        text: {
            required: true,
            type: String
        }
    },
    computed: {
        dynamicClasses() {
            const classes = [];

            if (this.size === 'small') {
                classes.push('cly-vue-status-tag--small');
            }

            if (this.loading) {
                classes.push('cly-vue-status-tag--gray');
            }
            else {
                classes.push(`cly-vue-status-tag--${this.color}`);
            }

            return classes;
        }
    }
};
</script>
