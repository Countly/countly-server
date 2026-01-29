<template>
    <div class="cly-vue-form-checklistbox">
        <cly-form-field :name="name" :required="required" direction="row" inline v-slot:default>
            <div class="cly-vue-form-checklistbox-field">
                <div class="bu-is-flex bu-is-align-items-center" style="height: 25px;">
                    <span class="text-small color-cool-gray-40 font-weight-bold">{{ label }}</span>
                </div>
                <div v-for="item in value" :key="item" class="cly-vue-form-checklistbox-field__item">
                    <span class="text-smallish color-warm-gray-100 has-ellipsis">{{ item }}</span>
                    <i class="bu-is-clickable color-cool-gray-20 cly-io cly-io-x" @click="deleteValue(item)"></i>
                </div>
            </div>
        </cly-form-field>
        <cly-checklistbox
            :options="options"
            :searchable="searchable"
            :search-placeholder="searchPlaceholder"
            height="auto"
            :value="value"
            :no-match-found-placeholder="$i18n('common.search.no-match-found')"
            @input="updateValue"
        ></cly-checklistbox>
    </div>
</template>

<script>
import { BaseComponentMixin } from './mixins.js';

export default {
    mixins: [BaseComponentMixin],
    props: {
        value: { type: Array },
        name: { type: String },
        label: { type: String },
        required: { type: Boolean, default: false },
        options: {
            type: Array,
            default: function() {
                return [];
            }
        },
        searchable: { type: Boolean, default: true },
        searchPlaceholder: { type: String, default: 'Search' }
    },
    methods: {
        deleteValue: function(item) {
            var newValue = this.value.slice();
            newValue.splice(newValue.indexOf(item), 1);
            this.$emit('input', newValue);
        },
        updateValue: function(value) {
            this.$emit('input', value);
        }
    }
};
</script>
