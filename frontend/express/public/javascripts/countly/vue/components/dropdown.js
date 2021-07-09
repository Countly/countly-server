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
        },
        computed: {
            iconClass: function() {
                return (this.opened ? 'arrow-up is-reverse' : 'arrow-up');
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
            }
        },
        methods: {
            focus: function() {
                this.$refs.elInput.focus();
            }
        },
        template: '<component\
                        :is="componentName"\
                        ref="elInput"\
                        :class="{ \'is-focus\': focused, \'is-disabled\': disabled, \'is-adaptive\': adaptiveLength }"\
                        v-bind="$attrs"\
                        readonly="readonly" \
                        v-model="description"\
                        :placeholder="placeholder">\
                        <template slot="suffix">\
                            <i v-if="arrow" class="el-select__caret el-input__icon" :class="[\'el-icon-\' + iconClass]"></i>\
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
                type: [Number, Object],
                default: null
            },
            placement: {
                type: String,
                default: 'bottom-start'
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
                focused: false,
                popperClass: 'cly-vue-dropdown__pop'
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
    Vue.component("cly-more-options", countlyBaseComponent.extend({
        componentName: 'ElDropdown',
        mixins: [ELEMENT.utils.Emitter],
        template: '<cly-dropdown ref="dropdown" v-on="$listeners">\
                        <template v-slot:trigger>\
                            <el-button :size="size" :icon="icon" :type="type">\
                            <span v-if="text">{{text}}</span>\
                            </el-button>\
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
            }
        },
        mounted: function() {
            this.$on('menu-item-click', this.handleMenuItemClick);
        },
        methods: {
            handleMenuItemClick: function(command, instance) {
                this.$emit('command', command, instance);
                this.$refs.dropdown.handleClose();
            }
        }
    }));

}(window.countlyVue = window.countlyVue || {}, jQuery));
