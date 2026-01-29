<template>
    <div class="cly-vue-form-field" :class="topClasses">
        <div class="bu-is-flex bu-is-justify-content-space-between bu-mr-2" v-if="!inline || tooltip || label || optional">
            <div :class="titleClasses" v-if="label" :data-test-id="testId + '-header'">{{ label }}</div>
            <cly-tooltip-icon v-if="tooltip" :data-test-id="testId + '-tooltip'" class="bu-is-flex-grow-1 bu-ml-2" :tooltip="tooltip"></cly-tooltip-icon>
            <div v-show="optional" class="text-small text-heading color-cool-gray-40">{{ $i18n("common.optional") }}</div>
        </div>
        <div v-if="subheading" :data-test-id="testId + '-sub-header'" class="color-cool-gray-50 text-small bu-mb-1">
            {{ subheading }}
        </div>
        <component :is="wrapperElement" @submit.prevent>
            <validation-provider v-if="$attrs.rules" v-bind="$attrs" v-on="$listeners" v-slot="validation">
                <div class="cly-vue-form-field__inner el-form-item" :class="{'is-error': validation.errors.length > 0}">
                    <slot v-bind="validation" />
                </div>
            </validation-provider>
            <div v-else class="cly-vue-form-field__inner el-form-item">
                <slot />
            </div>
        </component>
    </div>
</template>

<script>
import { BaseComponentMixin } from './mixins.js';

export default {
    mixins: [BaseComponentMixin],
    inheritAttrs: false,
    props: {
        subheading: { required: false },
        label: { required: false },
        optional: {
            type: Boolean,
            default: false
        },
        disableFormWrapping: {
            type: Boolean,
            default: false
        },
        inline: {
            type: Boolean,
            default: false,
            required: false
        },
        tooltip: { type: String, default: null },
        direction: {
            type: String,
            default: "column"
        },
        testId: {
            type: String,
            default: "cly-form-field-test-id"
        }
    },
    computed: {
        wrapperElement: function() {
            if (this.disableFormWrapping) {
                return "div";
            }
            return "form";
        },
        topClasses: function() {
            var classes = ["cly-vue-form-step__section"];
            if (this.direction === "row") {
                classes.push("bu-is-flex", "bu-is-flex-direction-row", "bu-is-align-items-center");
                return classes;
            }
            if (this.inline) {
                return null;
            }
            return classes;
        },
        titleClasses: function() {
            var classes = ["font-weight-bold"];
            if (this.direction === "row") {
                classes.push("text-small", "color-cool-gray-40");
            }
            if (this.direction === "column") {
                classes.push("text-smallish", "bu-mb-2");
            }
            return classes;
        }
    }
};
</script>
