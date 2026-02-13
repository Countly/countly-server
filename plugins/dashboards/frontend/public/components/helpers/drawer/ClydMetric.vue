<template>
<cly-form-field
    name="metrics"
    test-id="metric"
    rules="required"
    :label="i18nM(multiple ? 'dashboards.metrics-multi': 'dashboards.metrics-single')">
    <el-select
        :is-full-width="true"
        test-id="metric"
        :key="rerender"
        style="width: 100%;"
        v-bind="$attrs"
        v-on="allListeners"
        v-model="selectedMetrics"
        :collapse-tags="false"
        :multiple="multiple"
        :multiple-limit="multipleLimit"
        :placeholder="placeholderText">
        <el-option
            v-for="metric in metrics"
            :key="metric.value"
            :label="metric.label"
            :value="metric.value">
        </el-option>
    </el-select>
</cly-form-field>
</template>

<script>
import { i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyFormField from '../../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyFormField
    },
    props: {
        metrics: {
            type: Array,
            default: function() {
                return [];
            }
        },
        multipleLimit: {
            type: Number,
            default: 3
        },
        placeholder: {
            type: String
        },
        value: {
            type: Array,
            required: true,
            default: function() {
                return [];
            }
        },
        multiple: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        return {
            rerender: "_id_" + this.multiple
        };
    },
    computed: {
        placeholderText: function() {
            if (this.placeholder) {
                return this.placeholder;
            }

            if (this.multiple) {
                return this.i18n("placeholder.dashboards.select-metric-multi", this.multipleLimit);
            }
            else {
                return this.i18n("placeholder.dashboards.select-metric-single");
            }
        },
        selectedMetrics: {
            get: function() {
                if (!this.multiple) {
                    return this.value && this.value[0] || "";
                }

                return this.value;
            },
            set: function(item) {
                var i = item;
                if (!this.multiple) {
                    i = [item];
                }

                this.$emit("input", i);
            }
        },
        allListeners: function() {
            return Object.assign({},
                this.$listeners,
                {
                    input: function() {}
                }
            );
        }
    },
    watch: {
        multiple: {
            handler: function(newVal, oldVal) {
                if (newVal !== oldVal) {
                    this.rerender = "_id_" + this.multiple;
                    this.$emit("input", []);
                }
            }
        }
    }
};
</script>
