<template>
    <div class="cly-vue-form-field cly-vue-form-step__section bu-columns bu-is-vcentered bu-px-1 bu-mx-1">
        <div class="bu-column bu-is-4 bu-p-0">
            <p class="bu-has-text-weight-medium" :data-test-id="testId + '-label'">
                {{ label }} <span v-if="$attrs.rules && hasRequiredRule">*</span>
            </p>
            <p v-if="help" v-html="help" :data-test-id="testId + '-description'"></p>
        </div>
        <div class="bu-column bu-is-8 bu-has-text-left bu-p-0" :data-test-id="testId + '-value'">
            <validation-provider v-if="$attrs.rules" :name="label" v-bind="$attrs" v-on="$listeners" v-slot="validation">
                <div class="cly-vue-form-field__inner el-form-item el-form-item__content" :class="{'is-error': validation.errors.length > 0}">
                    <slot v-bind="validation" />
                    <div v-if="validation.errors.length" class="el-form-item__error">{{ validation.errors[0] }}</div>
                </div>
            </validation-provider>
            <div v-else class="cly-vue-form-field__inner el-form-item el-form-item__content">
                <slot />
            </div>
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../../mixins/base.js';

export default {
    mixins: [BaseComponentMixin],
    inheritAttrs: false,
    props: {
        label: String,
        help: String,
        testId: { type: String, default: 'cly-inline-form-field-default-test-id', required: false }
    },
    computed: {
        hasRequiredRule: function() {
            if (Array.isArray(this.$attrs.rules)) {
                return this.$attrs.rules.indexOf('required') !== -1;
            }
            return Object.keys(this.$attrs.rules).indexOf('required') !== -1;
        }
    }
};
</script>
