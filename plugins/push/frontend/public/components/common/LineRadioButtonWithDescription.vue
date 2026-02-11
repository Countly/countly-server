<template>
    <el-radio :label="label" :disabled="disabled"  :border="border" v-bind:class="['bu-my-1','bu-is-flex','bu-is-align-items-center', border?'cly-vue-push-notification-line-radio-button-with-description__border':'cly-vue-push-notification-line-radio-button-with-description__no-border']" v-model="innerValue">
        <div class="bu-is-flex bu-is-justify-content-space-between">
            <div class="cly-vue-push-notification-line-radio-button-with-description__title">{{title}}</div>
            <div v-if="description" class="cly-vue-push-notification-line-radio-button-with-description__content"> {{description}}</div>
        </div>
    </el-radio>
</template>

<script>
export default {
    props: {
        value: {
            type: String,
            required: true
        },
        label: {
            type: String,
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
        border: {
            type: Boolean,
            required: false,
            default: false,
        },
        disabled: {
            type: Boolean,
            required: false,
            default: false,
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
        }
    }
};
</script>
