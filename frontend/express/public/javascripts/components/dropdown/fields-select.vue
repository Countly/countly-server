<template>
    <cly-dropdown ref="dropdown" v-on="$listeners" class="cly-fields-select__dropdown">
        <template v-slot:trigger="dropdown">
            <slot name="trigger">
                <cly-input-dropdown-trigger
                    ref="trigger"
                    :disabled="false"
                    :adaptive-length="false"
                    :focused="dropdown.focused"
                    :opened="dropdown.visible"
                    :placeholder="label"
                >
                </cly-input-dropdown-trigger>
            </slot>
        </template>
        <div class="cly-fields-select default-skin">
            <div class="fields-select-body">
                <div>
                    <div>
                        <span class="cly-fields-select__title">{{ title }}</span>
                        <el-button class="cly-fields-select__reset" @click="reset" type="text">Reset Filters</el-button>
                    </div>
                    <table v-for="field in fields" :key="field.key">
                        <tr class="cly-fields-select__field">{{ field.label }}</tr>
                        <tr>
                            <el-select
                                class="cly-fields-select__field-dropdown"
                                :placeholder="internalValue[field.key].name ? internalValue[field.key].name : internalValue[field.key]"
                                v-model="internalValue[field.key]"
                            >
                                <el-option
                                    v-for="item in field.items"
                                    :key="item.key"
                                    :value="item.name"
                                >
                                </el-option>
                            </el-select>
                        </tr>
                    </table>
                </div>
                <div class="controls">
                    <el-button v-bind="$attrs" class="cly-fields-select__cancel" @click="close">
                        {{ cancelLabel }}
                    </el-button>
                    <el-button v-bind="$attrs" class="cly-fields-select__confirm" @click="save">
                        {{ confirmLabel }}
                    </el-button>
                </div>
            </div>
        </div>
    </cly-dropdown>
</template>

<script>
export default {
    props: {
        cancelLabel: {
            type: String,
            default: function() {
                return this.$i18n("events.general.cancel");
            }
        },
        confirmLabel: {
            type: String,
            default: function() {
                return this.$i18n("events.general.confirm");
            }
        },
        value: {
            type: Object,
            default: function() {
                return {};
            }
        },
        fields: {
            type: Array,
            default: function() {
                return [];
            }
        },
        title: {
            type: String,
            default: ''
        }
    },
    data: function() {
        return {
            internalValue: function() {
                return {};
            },
        };
    },
    watch: {
        value: {
            immediate: true,
            handler: function(newVal) {
                this.internalValue = Object.assign({}, newVal);
            }
        },
    },
    computed: {
        label: function() {
            var self = this;
            return Object.keys(this.value).map(function(fieldKey) {
                if (self.value[fieldKey] && self.value[fieldKey].name) {
                    return self.value[fieldKey].name;
                }
            }).join(", ");
        }
    },
    methods: {
        close: function(dontSync) {
            if (!dontSync) {
                this.internalValue = Object.assign({}, this.value);
            }
            this.$refs.dropdown.handleClose();
        },
        save: function() {
            this.$emit("input", this.internalValue);
            this.close(true);
        },
        reset: function() {
            var self = this;
            this.fields.forEach(function(field) {
                if (Object.prototype.hasOwnProperty.call(field, "default")) {
                    self.$set(self.internalValue, field.key, field.default);
                }
            });
            this.save();
        }
    }
};
</script>
