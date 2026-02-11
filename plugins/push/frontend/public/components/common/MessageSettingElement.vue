<template>
    <div class="cly-vue-drawer-step__section">
        <div class="cly-vue-drawer-step__line cly-vue-drawer-step__line--aligned">
            <div class="cly-vue-push-notification-drawer__input-label">
                {{label}}
                <div class="cly-vue-push-notification-drawer__input-description">{{description}}</div>
            </div>
            <div>
                <el-switch :value="toggle" @change="onToggle"></el-switch>
            </div>
        </div>
        <form>
        <slot v-if="hasDefaultSlot && toggle"></slot>
        <template v-else>
            <validation-provider v-slot="validation" v-if="toggle" :rules="rules">
                <el-input :value="input" @input="onInput" :placeholder="placeholder" :class="{'is-error': validation.errors.length > 0}" autocomplete="off"></el-input>
            </validation-provider>
        </template>
        </form>
    </div>
</template>

<script>
export default {
    props: {
        input: {
            type: String,
            default: "",
            required: false
        },
        toggle: {
            type: Boolean,
            default: false,
            required: true,
        },
        label: {
            type: String,
            default: "",
            required: true
        },
        placeholder: {
            type: String,
            default: "",
            required: false,
        },
        description: {
            type: String,
            default: "",
            required: false,
        },
        rules: {
            type: [String, Object],
            default: null,
            required: false,
        }
    },
    data: function() {
        return {
        };
    },
    computed: {
        hasDefaultSlot: function() {
            return Boolean(this.$slots.default);
        }
    },
    methods: {
        onToggle: function(value) {
            this.$emit("onToggle", value);
        },
        onInput: function(value) {
            this.$emit("onChange", value);
        }
    }
};
</script>
