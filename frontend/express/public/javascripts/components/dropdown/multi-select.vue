<template>
    <cly-dropdown ref="dropdown" v-on="$listeners" class="cly-multi-select__dropdown">
        <template v-slot:trigger="dropdown">
            <slot name="trigger">
                <cly-input-dropdown-trigger
                    ref="trigger"
                    :test-id="testId"
                    :disabled="false"
                    :adaptive-length="adaptiveLength"
                    :focused="dropdown.focused"
                    :opened="dropdown.visible"
                    :arrow="arrow"
                    :placeholder="dropdownLabel"
                >
                </cly-input-dropdown-trigger>
            </slot>
        </template>
        <div class="cly-multi-select default-skin">
            <div class="cly-multi-select__body">
                <div>
                    <div class="cly-multi-select__title-wrapper">
                        <span class="cly-multi-select__title" :data-test-id="testId + '-title'">{{ title }}</span>
                        <el-button
                            class="cly-multi-select__reset"
                            :data-test-id="testId + '-reset'"
                            @click="reset"
                            type="text"
                        >
                            {{ resetLabel }}
                        </el-button>
                    </div>
                    <table v-for="field in fields" :key="field.key">
                        <tr v-if="showThis(field.key)" class="cly-multi-select__field">
                            <span :data-test-id="testId + '-' + field.label.toString().replaceAll(' ', '-').toLowerCase() + '-label'">
                                {{ field.label }}
                            </span>
                        </tr>
                        <tr v-if="'items' in field && showThis(field.key)">
                            <cly-select-x
                                :test-id="testId + '-' + field.label.toString().replaceAll(' ', '-').toLowerCase() + '-input'"
                                :options="field.items"
                                :disabledOptions="field.disabled"
                                :show-search="field.searchable"
                                :searchable="field.searchable"
                                class="cly-multi-select__field-dropdown"
                                :width="selectXWidth"
                                :placeholder="optionLabel(field, unsavedValue[field.key])"
                                v-model="unsavedValue[field.key]"
                                style="margin-top:2px"
                            >
                            </cly-select-x>
                        </tr>
                        <tr v-else-if="'options' in field">
                            <cly-select-x
                                ref="selectX"
                                v-bind="field"
                                class="cly-multi-select__field-dropdown"
                                :width="selectXWidth"
                                :placeholder="optionLabel(field, unsavedValue[field.key])"
                                v-model="unsavedValue[field.key]"
                            >
                                <template v-slot:header="headerScope" v-if="field.header">
                                    <slot name="header" v-bind="headerScope"></slot>
                                </template>
                                <template v-slot:trigger="triggerScope" v-if="field.trigger">
                                    <slot name="trigger" v-bind="triggerScope"></slot>
                                </template>
                                <template v-slot:action v-if="field.action">
                                    <slot name="action"></slot>
                                </template>
                            </cly-select-x>
                        </tr>
                    </table>
                </div>
                <div class="cly-multi-select__controls">
                    <el-button
                        :data-test-id="testId + '-cancel-button'"
                        v-bind="$attrs"
                        class="el-button el-button--secondary el-button--small"
                        @click="close"
                    >
                        {{ cancelLabel }}
                    </el-button>
                    <el-button
                        :data-test-id="testId + '-confirm-button'"
                        v-bind="$attrs"
                        class="el-button el-button--success el-button--small"
                        @click="save"
                    >
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
        resetLabel: {
            type: String,
            default: "Reset Filters"
        },
        adaptiveLength: {
            type: Boolean,
            default: true
        },
        selectXWidth: {
            type: Number,
            default: 320
        },
        emptyValue: {
            type: String,
            default: function() {
                return "all";
            }
        },
        dependantFields: {
            type: Boolean,
            default: function() {
                return false;
            },
            required: false
        },
        arrow: {
            type: Boolean,
            default: false
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
            default: "Filter Parameters"
        },
        testId: {
            type: String,
            default: 'cly-multi-select-test-id'
        }
    },
    computed: {
        optionLabel: function() {
            return function(field, option) {
                var opt = (field.items || field.options || []).find(function(item) {
                    return item.value === option;
                });
                if (opt) {
                    return opt.label;
                }
                else {
                    var opts = field.items || field.options || [];
                    if (opts.length > 0) {
                        this.unsavedValue[field.key] = opts[0].key;
                        return opts[0].label;
                    }
                    else {
                        return "";
                    }
                }
            };
        },
        dropdownLabel: function() {
            var self = this;
            var forLabel = [];
            if (this.dependantFields) {
                for (var k in this.fields) {
                    forLabel.push(self.optionLabel(this.fields[k], self.value[this.fields[k].key]));
                    if (self.value[this.fields[k].key] === this.emptyValue) {
                        break;
                    }
                }
                return forLabel.join(", ");
            }
            else {
                return this.fields.map(function(field) {
                    return self.optionLabel(field, self.value[field.key]);
                }).join(", ");
            }
        }
    },
    data: function() {
        return {
            unsavedValue: Object.assign({}, this.value)
        };
    },
    watch: {
        value: {
            immediate: true,
            handler: function(newValue) {
                this.unsavedValue = Object.assign({}, newValue);
            }
        },
    },
    methods: {
        close: function(dontSync) {
            if (!dontSync) {
                this.unsavedValue = Object.assign({}, this.value);
            }
            if (this.$refs.selectX && this.$refs.selectX.length) {
                this.$refs.selectX.forEach(function(component) {
                    component.doClose();
                });
            }
            this.$refs.dropdown.handleClose();
        },
        save: function() {
            this.$emit("input", this.unsavedValue);
            this.$emit("change", this.unsavedValue);
            this.close();
        },
        showThis: function(key) {
            if (this.dependantFields) {
                for (var z in this.fields) {
                    if (this.fields[z].key === key) {
                        return true;
                    }
                    if (this.unsavedValue[this.fields[z].key] === this.emptyValue) {
                        return false;
                    }
                }
            }
            else {
                return true;
            }
        },
        reset: function() {
            var self = this;
            this.fields.forEach(function(field) {
                if ("default" in field) {
                    self.$set(self.unsavedValue, field.key, field.default);
                }
            });
            this.save();
        }
    }
};
</script>
