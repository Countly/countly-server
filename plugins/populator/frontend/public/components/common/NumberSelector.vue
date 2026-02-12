<template>
<div>
    <div class="bu-is-flex populator-number-selector">
        <div v-for="(item, index) in items" :key="item.value" class="populator-number-selector__each-box-wrapper">
            <div :class="{ 'populator-number-selector__active ': item.value === selectedValue, 'populator-number-selector__first' : index === 0, 'populator-number-selector__last' : index === (items.length - 1) }" class="populator-number-selector__each" @click="numberChange(item.value)">
                <span class="text-medium" :data-test-id="testId + '-item-' + item.text.toString().replaceAll(' ', '-').toLowerCase()">{{ item.text }}</span>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
    props: {
        value: {
            type: Number,
            default: 100
        },
        items: {
            type: Array,
            default: function() {
                return [];
            }
        },
        activeColorCode: {
            type: String,
            default: '#0166D6'
        },
        testId: {
            type: String,
            required: false,
            default: 'cly-populator-number-selector-default-test-id'
        }
    },
    data: function() {
        return {
            selectedValue: 0
        };
    },
    methods: {
        numberChange: function(val) {
            this.selectedValue = val;
            this.$emit('input', this.selectedValue);
        }
    },
    created: function() {
        this.selectedValue = this.value || 0;
    }
};
</script>
