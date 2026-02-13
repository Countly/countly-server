<template>
<div :class="[showCheckbox ? 'bu-mt-4' : 'bu-py-3']">
    <el-checkbox v-model="checkbox" v-if="showCheckbox">
        <span class="text-smallish">{{ i18nM("dashboards.custom-period") }}</span>
    </el-checkbox>
    <cly-form-field
        v-if="checkbox"
        name="title"
        :label="!showCheckbox && i18n('dashboards.period')"
        :rules="checkbox ? 'required' : ''">
        <cly-date-picker
            v-model="customPeriod"
            timestampFormat="ms"
            :disabled-shortcuts="disabledShortcuts"
            :allow-custom-range="allowCustomRange"
            :show-relative-modes="showRelativeModes"
            @change="onCustomPeriodChange"
        >
        </cly-date-picker>
    </cly-form-field>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyFormField from '../../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';
import ClyDatePicker from '../../../../../../../frontend/express/public/javascripts/components/date/date-picker.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyFormField,
        ClyDatePicker
    },
    props: {
        value: {
            type: [Array, String, Object, Boolean],
            default: ""
        },
        disabledShortcuts: {
            type: [Array, Boolean],
            default: false,
            required: false,
        },
        allowCustomRange: {
            type: Boolean,
            default: true,
            required: false
        },
        showRelativeModes: {
            type: Boolean,
            default: true,
            required: false
        },
        showCheckbox: {
            type: Boolean,
            default: true,
            required: false
        }
    },
    data: function() {
        return {
            titleCheckbox: null,
            default: "30days"
        };
    },
    computed: {
        customPeriod: {
            get: function() {
                return this.value || this.default;
            },
            set: function(t) {
                this.$emit("input", t);
            }
        },
        checkbox: {
            get: function() {
                if (this.titleCheckbox !== null) {
                    return this.titleCheckbox;
                }

                if (this.value || !this.showCheckbox) {
                    return true;
                }

                return false;
            },
            set: function(v) {
                if (v === false && this.value && this.value.length) {
                    this.$emit("input", "");
                }

                if (v && (!this.value || !this.value.length)) {
                    this.$emit("input", this.default);
                }

                this.titleCheckbox = v;
            }
        }
    },
    methods: {
        onCustomPeriodChange: function(periodObj) {
            if (periodObj.excludeCurrentDay && periodObj.value) {
                this.customPeriod = {period: periodObj.value, exclude_current_day: true};
            }
        }
    }
};
</script>
