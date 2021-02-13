/* global jQuery, Vue */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent;

    Vue.component("cly-input-dropdown-trigger", countlyBaseComponent.extend({
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
        methods: {
            focus: function() {
                this.$refs.elInput.focus();
            }
        },
        template: '<el-input\
                        ref="elInput"\
                        :class="{ \'is-focus\': focused, \'is-disabled\': disabled }"\
                        readonly="readonly" \
                        v-model="description"\
                        :placeholder="placeholder">\
                        <template slot="suffix">\
                            <i class="el-select__caret el-input__icon" :class="[\'el-icon-\' + iconClass]"></i>\
                        </template>\
                    </el-input>'

    }));

    var triggerProxy = countlyBaseComponent.extend({
        template: '<div><slot v-slot></slot></div>'
    });

    Vue.component("cly-dropdown", countlyBaseComponent.extend({
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
            },
            width: {
                type: Number,
                default: 400
            },
            placement: {
                type: String,
                default: 'bottom-start'
            }
        },
        template: '<div class="cly-vue-dropdown el-select"\
                    v-click-outside="handleOutsideClick">\
                    <trigger-proxy\
                        v-popover:popover\
                        ref="toggler"\
                        @click.native.stop="handleToggle"\
                        @keydown.native.esc.stop.prevent="handleClose"\
                        @keydown.native.down.enter.prevent="handleOpen"\
                        @keydown.native.down.stop.prevent="handleOpen"\
                        @keydown.native.up.stop.prevent="handleOpen">\
                        <slot name="trigger" :visible="visible" :focused="focused">\
                        </slot>\
                    </trigger-proxy>\
                    <el-popover\
                        ref="popover"\
                        :popper-class="\'cly-vue-dropdown__pop\'"\
                        :append-to-body="popperAppendToBody"\
                        :placement="placement"\
                        :visible-arrow="false"\
                        :width="width"\
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
                visible: false,
                focused: false
            };
        },
        mounted: function() {
            this.popperElm = this.$refs.popContent;
        },
        beforeDestroy: function() {
            this.popperElm = null;
        },
        methods: {
            doClose: function() {
                this.visible = false;
            },
            handleOutsideClick: function() {
                this.doClose();
                this.focused = false;
            },
            handleClose: function() {
                this.doClose();
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
                    this.focused = true;
                }
                else {
                    this.$emit("hide");
                }
            }
        }
    }));

    Vue.component("cly-input-dropdown", countlyBaseComponent.extend({
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

    Vue.component("cly-menubox", countlyBaseComponent.extend({
        template: '<div class="cly-vue-menubox menubox-default-skin" v-click-outside="outsideClose">\n' +
                        '<div class="menu-toggler" :class="{active: isOpened}" @click="toggle">\n' +
                            '<div class="text-container">\n' +
                                '<div class="text">{{label}}</div>\n' +
                            '</div>\n' +
                            '<div class="drop"></div>\n' +
                        '</div>\n' +
                        '<div class="menu-body" v-show="isOpened">\n' +
                            '<slot></slot>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            label: { type: String, default: '' },
            isOpened: { type: Boolean, default: false }
        },
        methods: {
            toggle: function() {
                this.setStatus(!this.isOpened);
            },
            close: function() {
                this.setStatus(false);
            },
            outsideClose: function() {
                this.close();
                this.$emit('discard');
            },
            setStatus: function(targetState) {
                this.$emit('status-changed', targetState);
            }
        }
    }));

    Vue.component("cly-button-menu", countlyBaseComponent.extend({
        template: '<div class="cly-vue-button-menu" :class="[skinClass]" v-click-outside="close">\n' +
                        '<div class="toggler" @click.stop="toggle"></div>\n' +
                        '<div class="menu-body" :class="{active: opened}">\n' +
                            '<a @click="fireEvent(item.event)" class="item" v-for="(item, i) in items" :key="i">\n' +
                                '<i :class="item.icon"></i>\n' +
                                '<span>{{item.label}}</span>\n' +
                            '</a>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            items: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            skin: { default: "default", type: String}
        },
        computed: {
            skinClass: function() {
                if (["default", "single"].indexOf(this.skin) > -1) {
                    return "button-menu-" + this.skin + "-skin";
                }
                return "button-menu-default-skin";
            },
        },
        data: function() {
            return {
                opened: false
            };
        },
        methods: {
            toggle: function() {
                this.opened = !this.opened;
            },
            close: function() {
                this.opened = false;
            },
            fireEvent: function(eventKey) {
                this.$emit(eventKey);
                this.close();
            }
        }
    }));

}(window.countlyVue = window.countlyVue || {}, jQuery));
