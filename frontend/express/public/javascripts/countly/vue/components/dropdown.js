/* global jQuery, Vue, ELEMENT, CV */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    Vue.component("cly-input-dropdown-trigger", countlyBaseComponent.extend({
        props: {
            focused: {type: Boolean, default: false},
            opened: {type: Boolean, default: false},
            arrow: {type: Boolean, default: true},
            selectedOptions: {
                type: [Array, Object, String],
                default: function() {
                    return {};
                }
            },
            placeholder: {type: String, default: ''},
            disabled: {type: Boolean, default: false},
            adaptiveLength: {type: Boolean, default: false},
            testId: {type: String, default: 'cly-input-dropdown-trigger'}
        },
        computed: {
            iconClass: function() {
                return (this.opened ? 'ion-arrow-up-b is-reverse' : 'ion-arrow-up-b');
            },
            description: function() {
                if (Array.isArray(this.selectedOptions)) {
                    return this.selectedOptions.map(function(option) {
                        return option.label;
                    }).join(', ');
                }
                else if (typeof this.selectedOptions === 'string') {
                    return this.selectedOptions;
                }
                return this.selectedOptions.label;
            },
            componentName: function() {
                if (this.adaptiveLength) {
                    return "el-pseudo-input";
                }
                return "el-input";
            },
            classes: function() {
                var classes = {
                    'is-focus': this.focused,
                    'is-disabled': this.disabled,
                    'is-adaptive': this.adaptiveLength,
                    'is-arrow': this.arrow
                };

                return classes;
            }
        },
        methods: {
            focus: function() {
                this.$refs.elInput.focus();
            }
        },
        template: '<component\
                        :is="componentName"\
                        :data-test-id="testId"\
                        :test-id="testId"\
                        class="cly-input-dropdown-trigger"\
                        ref="elInput"\
                        :class="classes"\
                        v-bind="$attrs"\
                        readonly="readonly" \
                        v-model="description"\
                        :placeholder="placeholder">\
                        <template v-slot:prefix="scope">\
                            <slot name="prefix" v-bind="scope"></slot>\
                        </template>\
                        <template slot="suffix" v-if="arrow">\
                            <i class="el-select__caret" :class="[iconClass]"></i>\
                        </template>\
                    </component>'
    }));

    var triggerProxy = countlyBaseComponent.extend({
        template: '<div style="width:100%"><slot v-slot></slot></div>'
    });

    Vue.component("cly-dropdown", countlyBaseComponent.extend({
        components: {
            'trigger-proxy': triggerProxy,
            'el-select-dropdown': ELEMENT.SelectDropdown
        },
        mixins: [ELEMENT.utils.Emitter],
        props: {
            disabled: {
                type: Boolean,
                default: false
            },
            popperAppendToBody: {
                type: Boolean,
                default: true
            },
            width: {
                type: [Number, Object, String],
                default: null
            },
            placement: {
                type: String,
                default: 'bottom-start'
            },
            popClass: {
                type: String
            }
        },
        inject: {
            popperAncestors: {
                default: function() {
                    return {};
                }
            }
        },
        computed: {
            popperUid: function() {
                return "popper-" + this.componentId;
            },
            popperClass: function() {
                return "cly-vue-dropdown__pop" + (this.popClass ? " " + this.popClass : "");
            }
        },
        provide: function() {
            var history = Object.assign({}, this.popperAncestors);
            history[this.popperUid] = true;
            return {
                'popperAncestors': history
            };
        },
        template: '<div class="cly-vue-dropdown el-select"\
                    v-click-outside="handleOutsideClick">\
                    <trigger-proxy\
                        ref="reference"\
                        @click.native.stop="handleToggle"\
                        @keydown.native.esc.stop.prevent="handleClose(true)"\
                        @keydown.native.down.enter.prevent="handleOpen"\
                        @keydown.native.down.stop.prevent="handleOpen"\
                        @keydown.native.up.stop.prevent="handleOpen">\
                        <slot name="trigger" :visible="visible" :focused="focused">\
                        </slot>\
                    </trigger-proxy>\
                    <el-select-dropdown\
                        ref="popper"\
                        :width="width"\
                        :append-to-body="popperAppendToBody"\
                        :placement="placement"\
                        :visible-arrow="false"\
                        v-model="visible"\
                        v-show="visible">\
                        <div ref="popContent" class="cly-vue-dropdown__pop-container">\
                            <slot>\
                            </slot>\
                        </div>\
                    </el-select-dropdown>\
                </div>',
        data: function() {
            return {
                visible: false,
                focused: false
            };
        },
        beforeDestroy: function() {
            this.broadcast('ElSelectDropdown', 'destroyPopper');
            this.$refs.popper && this.$refs.popper.doDestroy();
        },
        methods: {
            doClose: function(aborted) {
                if (this.visible) {
                    this.visible = false;
                    this.$emit("hide", aborted);
                }
            },
            handleOutsideClick: function() {
                this.doClose(true);
                this.focused = false;
            },
            handleClose: function(aborted) {
                this.doClose(aborted);
            },
            handleOpen: function() {
                if (!this.disabled && !this.visible) {
                    this.visible = true;
                }
            },
            handleToggle: function() {
                if (this.disabled && !this.visible) {
                    return;
                }
                this.visible = !this.visible;
                if (!this.visible) {
                    this.$emit("hide", true);
                }
            },
            updateDropdown: function() {
                var self = this;
                this.$nextTick(function() {
                    self.broadcast('ElSelectDropdown', 'updatePopper');
                });
            }
        },
        watch: {
            visible: function(newValue) {
                if (newValue) {
                    this.$emit("show");
                    this.focused = true;
                }
            }
        }
    }));

    Vue.component("cly-fields-select", countlyBaseComponent.extend({
        mixins: [_mixins.i18n],
        template: '<cly-dropdown ref="dropdown" v-on="$listeners" class="cly-fields-select__dropdown">\
                        <template v-slot:trigger="dropdown">\
                        <slot name="trigger">\
                            <cly-input-dropdown-trigger\
                                ref="trigger"\
                                :disabled="false"\
                                :adaptive-length="false"\
                                :focused="dropdown.focused"\
                                :opened="dropdown.visible"\
                                :placeholder="label"\>\
                            </cly-input-dropdown-trigger>\
                        </slot>\
                        </template>\
                        <div class="cly-fields-select default-skin">\
                        <div class="fields-select-body">\
                            <div>\
                            <div>\
                            <span class="cly-fields-select__title">{{title}}</span>\
                            <el-button class="cly-fields-select__reset" @click="reset" type="text">Reset Filters</el-button>\
                            </div>\
                            <table  \
                                v-for="field in fields" :key="field.key">\
                                <tr class="cly-fields-select__field">{{ field.label }}</tr>\
                                <tr>\
                                    <el-select class="cly-fields-select__field-dropdown" :placeholder="internalValue[field.key].name?internalValue[field.key].name:internalValue[field.key]" v-model="internalValue[field.key]">\
                                        <el-option v-for="item in field.items" :key="item.key"\
                                            :value="item.name">\
                                        </el-option>\
                                    </el-select>\
                                </tr>\
                            </table>\
                            </div>\
                            <div class="controls">\
                            <el-button v-bind="$attrs" class="cly-fields-select__cancel" @click="close">  {{cancelLabel}}\
                            </el-button>\
                            <el-button v-bind="$attrs" class="cly-fields-select__confirm" @click="save">  {{confirmLabel}}\
                            </el-button>\
                            </div>\
                        </div>\
                        </div>\
                    </cly-dropdown>',
        props: {
            cancelLabel: {
                type: String,
                default: CV.i18n("events.general.cancel")
            },
            confirmLabel: {
                type: String,
                default: CV.i18n("events.general.confirm")
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
    }));

    Vue.component("cly-multi-select", countlyBaseComponent.extend({
        mixins: [_mixins.i18n],
        template: '<cly-dropdown ref="dropdown" v-on="$listeners" class="cly-multi-select__dropdown">\
                        <template v-slot:trigger="dropdown">\
                            <slot name="trigger">\
                                <cly-input-dropdown-trigger\
                                    ref="trigger"\
                                    :test-id="testId"\
                                    :disabled="false"\
                                    :adaptive-length="adaptiveLength"\
                                    :focused="dropdown.focused"\
                                    :opened="dropdown.visible"\
                                    :arrow="arrow"\
                                    :placeholder="dropdownLabel">\
                                </cly-input-dropdown-trigger>\
                            </slot>\
                        </template>\
                        <div class="cly-multi-select default-skin">\
                            <div class="cly-multi-select__body">\
                                <div>\
                                    <div class="cly-multi-select__title-wrapper">\
                                        <span class="cly-multi-select__title" :data-test-id="testId + \'-title\'">{{title}}</span>\
                                        <el-button class="cly-multi-select__reset" :data-test-id="testId + \'-reset\'" @click="reset" type="text">{{resetLabel}}</el-button>\
                                    </div>\
                                    <table v-for="field in fields" :key="field.key">\
                                        <tr v-if="showThis(field.key)" class="cly-multi-select__field"><span :data-test-id="testId + \'-\' + field.label.toString().replace(\' \', \'-\').toLowerCase() + \'-label\'">{{field.label}}</span></tr>\
                                        <tr v-if="\'items\' in field && showThis(field.key)">\
                                            <cly-select-x :test-id="testId + \'-\' + field.label.toString().replace(\' \', \'-\').toLowerCase() + \'-input\'" :options="field.items" :show-search="field.searchable" :searchable="field.searchable" class="cly-multi-select__field-dropdown" :width="selectXWidth" :placeholder="optionLabel(field, unsavedValue[field.key])" v-model="unsavedValue[field.key]" style="margin-top:2px">\
                                                <template v-slot:selectList="listScope" v-if="omittedSegments.options.length">\
                                                    <div class="cly-vue-events-omitted-segments bu-ml-1" v-if="listScope.searchQuery == \'\'">\
                                                        <div class="cly-vue-events-omitted-segments__title">\
                                                            {{omittedSegments.label}}\
                                                        </div>\
                                                        <div class="cly-vue-events-omitted-segments__item" v-for="item in omittedSegments.options">\
                                                            {{item.label}}\
                                                        </div>\
                                                    </div>\
                                                </template>\
                                            </cly-select-x>\
                                        </tr>\
                                        <tr v-else-if="\'options\' in field">\
                                            <cly-select-x ref="selectX" v-bind="field" class="cly-multi-select__field-dropdown" :width="selectXWidth" :placeholder="optionLabel(field, unsavedValue[field.key])" v-model="unsavedValue[field.key]">\
                                                <template v-slot:header="headerScope" v-if="field.header">\
                                                    <slot name="header" v-bind="headerScope"></slot>\
                                                </template>\
                                                <template v-slot:trigger="triggerScope" v-if="field.trigger">\
                                                    <slot name="trigger" v-bind="triggerScope"></slot>\
                                                </template>\
                                                <template v-slot:action v-if="field.action">\
                                                    <slot name="action"></slot>\
                                                </template>\
                                            </cly-select-x>\
                                        </tr>\
                                    </table>\
                                </div>\
                                <div class="cly-multi-select__controls">\
                                    <el-button :data-test-id="testId + \'-cancel-button\'" v-bind="$attrs" class="el-button el-button--secondary el-button--small" @click="close">{{cancelLabel}}</el-button>\
                                    <el-button :data-test-id="testId + \'-confirm-button\'" v-bind="$attrs" class="el-button el-button--success el-button--small" @click="save">{{confirmLabel}}</el-button>\
                                </div>\
                            </div>\
                        </div>\
                    </cly-dropdown>',
        props: {
            cancelLabel: {type: String, default: CV.i18n("events.general.cancel")},
            confirmLabel: {type: String, default: CV.i18n("events.general.confirm")},
            resetLabel: {type: String, default: "Reset Filters"},
            adaptiveLength: {type: Boolean, default: true},
            selectXWidth: {type: Number, default: 320},
            emptyValue: {
                type: String,
                default: function() {
                    return "all";
                }
            },
            omittedSegments: {
                type: Object,
                default: function() {
                    return [];
                }
            },
            dependantFields: {
                type: Boolean,
                default: function() {
                    return false;
                },
                required: false
            },
            arrow: {type: Boolean, default: false},
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
            title: {type: String, default: "Filter Parameters"},
            testId: {type: String, default: 'cly-multi-select-test-id'}
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
                if (this.dependantFields) { //do not add values from next one if previous is not chosen.
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
                        if (this.unsavedValue[this.fields[z].key] === this.emptyValue) { //we have unfilled one before
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
    }));

    Vue.component("cly-more-options", countlyBaseComponent.extend({
        componentName: 'ElDropdown',
        mixins: [ELEMENT.utils.Emitter],
        template: '<cly-dropdown class="cly-vue-more-options" ref="dropdown" :placement="placement" :disabled="disabled" v-on="$listeners">\
                        <template v-slot:trigger>\
                            <slot name="trigger">\
                                <el-button :data-test-id="testId + \'-more-option-button\'" :size="size" :icon="icon" :type="type">\
                                <span :data-test-id="testId + \'-more-option-text\'" v-if="text">{{text}}</span>\
                                </el-button>\
                            </slot>\
                        </template>\
                        <template v-slot>\
                            <slot>\
                            </slot>\
                        </template>\
                    </cly-dropdown>',
        props: {
            size: {
                type: String,
                default: 'small'
            },
            icon: {
                type: String,
                default: 'el-icon-more'
            },
            text: {
                type: String,
                default: null
            },
            type: {
                type: String,
                default: 'default'
            },
            disabled: {
                type: Boolean,
                default: false
            },
            placement: {
                type: String,
                default: 'bottom-end'
            },
            testId: {
                type: String,
                default: 'cly-more-options-test-id'
            }
        },
        mounted: function() {
            this.$on('menu-item-click', this.handleMenuItemClick);
        },
        methods: {
            handleMenuItemClick: function(command, instance) {
                if (!this.disabled) {
                    this.$emit('command', command, instance);
                    this.$refs.dropdown.handleClose();
                }
            }
        },
        beforeDestroy: function() {
            this.$off();
        }
    }));

}(window.countlyVue = window.countlyVue || {}, jQuery));
