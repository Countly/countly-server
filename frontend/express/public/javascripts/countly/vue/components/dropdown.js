/* global jQuery, Vue */

(function(countlyVue) {

    Vue.component("cly-input-dropdown-trigger", countlyVue.components.BaseComponent.extend({
        props: {
            focused: {type: Boolean, default: false},
            opened: {type: Boolean, default: false},
            selectedOptions: {
                type: [Array, Object],
                default: function() {
                    return {};
                }
            },
            placeholder: {type: String, default: ''},
            disabled: {type: Boolean, default: false}
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
                return this.selectedOptions.label;
            }
        },
        template: '<el-input\
                        :class="{ \'is-focus\': focused, \'is-disabled\': disabled }"\
                        readonly="readonly" \
                        v-model="description"\
                        :placeholder="placeholder">\
                        <template slot="suffix">\
                            <i class="el-select__caret el-input__icon" :class="[\'el-icon-\' + iconClass]"></i>\
                        </template>\
                    </el-input>'

    }));

    var triggerProxy = countlyVue.components.BaseComponent.extend({
        template: '<div><slot v-slot></slot></div>'
    });

    Vue.component("cly-dropdown", countlyVue.components.BaseComponent.extend({
        components: {
            'trigger-proxy': triggerProxy
        },
        props: {
            disabled: {
                type: Boolean,
                default: false
            },
            popperAppendToBody: {
                type: Boolean,
                default: true
            }
        },
        template: '<div class="cly-vue-dropdown el-select"\
                    v-click-outside="handleOutsideClick">\
                    <trigger-proxy\
                        ref="toggler"\
                        v-popover:popover\
                        @click.native.stop="handleToggle"\
                        @keydown.native.esc.stop.prevent="handleClose"\
                        @keydown.native.down.enter.prevent="handleOpen"\
                        @keydown.native.down.stop.prevent="handleOpen"\
                        @keydown.native.up.stop.prevent="handleOpen">\
                        <slot name="trigger" :visible="visible">\
                        </slot>\
                    </trigger-proxy>\
                    <el-popover\
                        :popper-class="\'cly-vue-dropdown__pop\'"\
                        ref="popover"\
                        :append-to-body="popperAppendToBody"\
                        placement="bottom-start"\
                        :visible-arrow="false"\
                        width="400"\
                        v-model="visible"\
                        trigger="manual">\
                        <div ref="popContent" class="cly-vue-dropdown__pop-container">\
                            <slot>\
                            </slot>\
                        </div>\
                    </el-popover>\
                </div>',
        data: function() {
            return {
                visible: false
            };
        },
        mounted: function() {
            this.popperElm = this.$refs.popContent; // ignore popover clicks (clickoutside)
        },
        methods: {
            doClose: function() {
                this.visible = false;
            },
            handleOutsideClick: function() {
                this.doClose();
            },
            handleClose: function() {
                var self = this;
                this.doClose();
                this.$nextTick(function() {
                    self.$refs.toggler.focus();
                });
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
                    self.$refs.popover.updatePopper();
                });
            }
        },
        watch: {
            visible: function(newValue) {
                if (newValue) {
                    this.$emit("show");
                }
                else {
                    this.$emit("hide");
                }
            }
        }
    }));

    Vue.component("cly-input-dropdown", countlyVue.components.BaseComponent.extend({
        template: '<cly-dropdown ref="dropdown" :disabled="disabled" v-on="$listeners" v-bind="$attrs">\
                        <template v-slot:trigger="dropdown">\
                            <cly-input-dropdown-trigger\
                                :disabled="disabled"\
                                :focused="dropdown.visible"\
                                :opened="dropdown.visible"\
                                :placeholder="placeholder"\
                                :selected-options="selectedOptions">\
                            </cly-input-dropdown-trigger>\
                        </template>\
                        <template v-slot :handleClose="handleClose">\
                            <slot>\
                            </slot>\
                        </template>\
                    </cly-dropdown>',
        props: {
            placeholder: {type: String, default: 'Select'},
            selectedOptions: { type: [Object, Array] },
            disabled: { type: Boolean, default: false}
        },
        methods: {
            handleClose: function() {
                this.$refs.dropdown.handleClose();
            },
            updateDropdown: function() {
                this.$refs.dropdown.updateDropdown();
            }
        }
    }));

}(window.countlyVue = window.countlyVue || {}, jQuery));
