<template>
    <component
        :is="componentName"
        :data-test-id="testId"
        :test-id="testId"
        class="cly-input-dropdown-trigger"
        ref="elInput"
        :class="classes"
        v-bind="$attrs"
        readonly="readonly"
        v-model="description"
        :placeholder="placeholder"
    >
        <template v-slot:prefix>
            <slot name="prefix"></slot>
        </template>
        <template slot="suffix" v-if="arrow">
            <i class="el-select__caret" :class="[iconClass]"></i>
        </template>
    </component>
</template>

<script>
export default {
    props: {
        focused: {
            type: Boolean,
            default: false
        },
        opened: {
            type: Boolean,
            default: false
        },
        arrow: {
            type: Boolean,
            default: true
        },
        selectedOptions: {
            type: [Array, Object, String],
            default: function() {
                return {};
            }
        },
        placeholder: {
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false
        },
        adaptiveLength: {
            type: Boolean,
            default: false
        },
        testId: {
            type: String,
            default: 'cly-input-dropdown-trigger'
        }
    },
    computed: {
        iconClass: function() {
            return (this.opened ? 'ion-arrow-up-b is-reverse' : 'ion-arrow-up-b');
        },
        description: function() {
            if (Array.isArray(this.selectedOptions)) {
                return this.selectedOptions.map(function(option) {
                    return option.label;
                }).join(', ');
            }
            else if (typeof this.selectedOptions === 'string') {
                return this.selectedOptions;
            }
            return this.selectedOptions.label;
        },
        componentName: function() {
            if (this.adaptiveLength) {
                return "el-pseudo-input";
            }
            return "el-input";
        },
        classes: function() {
            var classes = {
                'is-focus': this.focused,
                'is-disabled': this.disabled,
                'is-adaptive': this.adaptiveLength,
                'is-arrow': this.arrow
            };
            return classes;
        }
    },
    methods: {
        focus: function() {
            this.$refs.elInput.focus();
        }
    }
};
</script>
