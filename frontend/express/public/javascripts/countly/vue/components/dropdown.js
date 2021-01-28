/* global jQuery, Vue */

(function(countlyVue) {

    Vue.component("cly-input-dropdown-trigger", countlyVue.components.BaseComponent.extend({
        props: {
            focused: {type: Boolean, default: false},
            opened: {type: Boolean, default: false},
            value: {type: [Number, String], default: ''},
            placeholder: {type: String, default: ''},
        },
        computed: {
            iconClass: function() {
                return (this.opened ? 'arrow-up is-reverse' : 'arrow-up');
            }
        },
        template: '<el-input\
                        :class="{ \'is-focus\': focused }"\
                        readonly="readonly" \
                        v-model="value"\
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
        template: '<div class="cly-vue-dropdown el-select"\
                    v-click-outside="handleOutsideClick">\
                    <trigger-proxy\
                        ref="toggler"\
                        v-popover:popover\
                        @keydown.native.esc.stop.prevent="handleClose"\
                        @keydown.native.down.enter.prevent="handleArrowKey"\
                        @keydown.native.down.stop.prevent="handleArrowKey"\
                        @keydown.native.up.stop.prevent="handleArrowKey">\
                        <slot name="trigger" :visible="visible">\
                        </slot>\
                    </trigger-proxy>\
                    <el-popover\
                        ref="popover"\
                        placement="bottom-start"\
                        :visible-arrow="false"\
                        width="400"\
                        v-model="visible"\
                        trigger="click">\
                        <div ref="popContent" class="cly-vue-dropdown-listbox__pop">\
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
            handleArrowKey: function() {
                if (!this.visible) {
                    this.visible = true;
                }
            },
            updateDropdown: function() {
                var self = this;
                this.$nextTick(function() {
                    self.$refs.popover.updatePopper();
                });
            }
        }
    }));

    Vue.component("cly-input-dropdown", countlyVue.components.BaseComponent.extend({
        template: '<cly-dropdown ref="dropdown">\
                        <template v-slot:trigger="dropdown">\
                            <cly-input-dropdown-trigger\
                                :focused="dropdown.visible"\
                                :opened="dropdown.visible"\
                                :placeholder="placeholder"\
                                v-model="value">\
                            </cly-input-dropdown-trigger>\
                        </template>\
                        <template v-slot :handleClose="handleClose">\
                            <slot>\
                            </slot>\
                        </template>\
                    </cly-dropdown>',
        props: {
            placeholder: {type: String, default: 'Select'},
            value: { type: [String, Number] }
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
