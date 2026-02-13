<template>
<cly-form-field
    name="metrics"
    rules="required"
    label="Display type">
    <el-select
        :is-full-width="true"
        :key="rerender"
        style="width: 100%;"
        v-bind="$attrs"
        v-on="allListeners"
        v-model="selectedValue"
        :collapse-tags="false"
        :multiple="false"
        :placeholder="placeholderText">
        <el-option
            v-for="value in values"
            :key="value.value"
            :label="value.label"
            :value="value.value">
        </el-option>
    </el-select>
</cly-form-field>
</template>

<script>
import ClyFormField from '../../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';

export default {
    components: {
        ClyFormField
    },
    props: {
        values: {
            type: Array,
            default: function() {
                return [{label: "Percentage", value: "percentage"}, {label: "Value", value: "value"}];
            }
        },
        placeholder: {
            type: String
        },
        value: {
            type: String,
            required: true,
            default: function() {
                return "";
            }
        }
    },
    data: function() {
        return {
            rerender: "_id_" + this.multiple
        };
    },
    computed: {
        placeholderText: function() {
            return this.placeholder || "Select display type";
        },
        selectedValue: {
            get: function() {
                return this.value;
            },
            set: function(item) {
                this.$emit("input", item);
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
                    this.$emit("input", "");
                }
            }
        }
    }
};
</script>
