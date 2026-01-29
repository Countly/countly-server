<template>
    <div
        class="cly-option-swapper"
        :class="{
            'cly-option-swapper--disabled': disabled
        }"
    >
        <div
            v-for="(option, index) in options"
            :key="`cly-option-swapper-option-${index}`"
            :data-test-id="`cly-option-swapper-option-${testId}-${option.value.toString().toLowerCase()}`"
            v-tooltip="option.tooltip"
            class="cly-option-swapper__option"
            :class="{
                'cly-option-swapper__option--active': option.value === selectedOption,
                'cly-option-swapper__option--disabled': option.disabled || disabled,
                'cly-option-swapper__option--first': index === 0,
                'cly-option-swapper__option--last': index === (options.length - 1),
                'cly-option-swapper__option--no-highlight': !highlightOnSelect
            }"
            @click="onOptionClick(option)"
        >
            <i
                v-if="option.icon"
                :class="option.icon"
            />
            <span v-else>{{ option.text }}</span>
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../form/mixins.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        disabled: {
            default: false,
            type: Boolean
        },
        highlightOnSelect: {
            default: true,
            type: Boolean
        },
        options: {
            default: () => [],
            type: Array
        },
        value: {
            default: null,
            type: [String, Number]
        },
        testId: {
            type: String,
            default: 'cly-option-swapper-test-id',
            required: false
        }
    },
    computed: {
        selectedOption: {
            get() {
                return this.value || this.options[0].value;
            },
            set(value) {
                this.$emit('input', value);
            }
        }
    },
    methods: {
        onOptionClick: function(option) {
            if (!option.disabled) {
                this.selectedOption = option.value;
            }
        }
    }
};
</script>
