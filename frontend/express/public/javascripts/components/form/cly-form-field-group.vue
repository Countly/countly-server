<template>
    <div class="cly-vue-form-step__auto-group">
        <h4 class="bu-is-flex bu-is-align-items-baseline" :class="labelClasses" v-if="label">
            {{ label }}
            <cly-tooltip-icon v-if="tooltip" class="bu-is-flex-grow-1 bu-ml-2" :tooltip="tooltip"></cly-tooltip-icon>
        </h4>
        <span v-if="description" class="color-cool-gray-50 text-small bu-mb-1">{{ description }}</span>
        <div :class="groupingClasses">
            <slot></slot>
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from './mixins.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        label: String,
        highlight: {
            type: Boolean,
            default: false
        },
        tooltip: { type: String, default: null },
        description: { type: String, default: null }
    },
    computed: {
        groupingClasses: function() {
            if (this.highlight) {
                return [
                    "cly-vue-form-step__section-group",
                    "cly-vue-form-step__section-group--filled"
                ];
            }
            return "";
        },
        labelClasses: function() {
            if (this.highlight) {
                return "bu-mb-4";
            }
            return "";
        }
    }
};
</script>
