/* global jQuery, Vue, ELEMENT */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent;

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
                        :class="{ \'is-focus\': focused, \'is-disabled\': disabled }"\
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
            selectedOptions: { type: [Object, Array, String] },
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

    Vue.component("cly-more-options", countlyBaseComponent.extend({
        componentName: 'ElDropdown',
        mixins: [ELEMENT.utils.Emitter],
        template: '<cly-dropdown ref="dropdown" v-on="$listeners">\
                        <template v-slot:trigger>\
                            <el-button :size="size" icon="el-icon-more"></el-button>\
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
