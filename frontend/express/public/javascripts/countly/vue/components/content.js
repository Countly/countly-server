/* global Vue, CV */
(function(countlyVue) {
    Vue.component("cly-content-layout", countlyVue.components.create({
        props: {
            backgroundColor: {
                type: String,
                required: false,
                default: null
            }
        },
        data: function() {
            return {
                currentTab: this.meta?.tabs[0]?.value || null,
                isActive: false
            };
        },
        computed: {
        },
        template: CV.T('/javascripts/countly/vue/templates/content/content.html'),
        methods: {
        }
    }));

    Vue.component("cly-content-header", countlyVue.components.create({
        props: {
            title: {
                type: String,
                required: true,
                default: null
            },
            version: {
                type: String,
                required: true,
                default: null
            },
            createdBy: {
                type: String,
                required: true,
                default: null
            },
            toggle: {
                type: Boolean,
                required: false,
                default: false
            },
            closeButton: {
                type: Boolean,
                required: false,
                default: true
            },
            tabs: {
                type: Array,
                required: false,
                default: function() {
                    return [];
                }
            },
            status: {
                type: String,
                required: false,
                default: null
            },
            saveButtonLabel: {
                type: String,
                required: false,
                default: CV.i18n('common.save')
            },
            topDropdownOptions: {
                type: Array,
                required: false,
                default: function() {
                    return [];
                }
            },
            hideSaveButton: {
                type: Boolean,
                required: false,
                default: false
            },
            backgroundColor: {
                type: String,
                required: false,
                default: '#fff'
            }
        },
        data: function() {
            return {
                currentTab: this.tabs[0]?.value || null
            };
        },
        watch: {
            currentTab: function(newVal) {
                this.$emit('tab-change', newVal);
            }
        },
        methods: {
            close: function() {
                this.$emit('close');
            },
            save: function() {
                this.$emit('save');
            },
            handleCommand: function(event) {
                this.$emit('handle-command', event);
            }
        },
        template: CV.T('/javascripts/countly/vue/templates/content/content-header.html')
    }));

    Vue.component("cly-content-body", countlyVue.components.create({
        props: {
            currentTab: {
                type: String,
                required: false,
                default: null
            },
            hideLeftSidebar: {
                type: Boolean,
                required: false,
                default: false
            },
            hideRightSidebar: {
                type: Boolean,
                required: false,
                default: false
            },
            collapsible: {
                type: Boolean,
                required: false,
                default: true
            },
            rightSidebarWidth: {
                type: String,
                required: false,
                default: null
            },
            leftSidebarWidth: {
                type: String,
                required: false,
                default: null
            },
            hasDashedBackground: {
                type: Boolean,
                required: false,
                default: false
            },
            backgroundColor: {
                type: String,
                required: false,
                default: '#fff'
            }
        },
        data: function() {
            return {
                toggleTransition: 'stdt-slide-left',
                isLeftSidebarHidden: this.hideLeftSidebar
            };
        },
        computed: {
        },
        template: CV.T('/javascripts/countly/vue/templates/content/content-body.html'),
        methods: {
            collapseBar: function(position) {
                if (position === 'left') {
                    this.isLeftSidebarHidden = !this.isLeftSidebarHidden;
                }
            },
            onViewEntered: function() { //?
                this.$refs.rootEl.focus();
            }
        },
        created: function() {
        }
    }));

    Vue.component("cly-status-badge", countlyVue.components.create({
        props: {
            label: {
                type: String,
                required: false,
                default: 'Status'
            },
            color: {
                type: String,
                required: false,
                default: 'gray'
            },
            icon: {
                type: String,
                required: false,
                default: 'cly-is cly-is-status'
            },
            iconSize: {
                type: String,
                required: false,
                default: '8'
            },
            width: {
                type: String,
                required: false,
                default: '55'
            },
            height: {
                type: String,
                required: false,
                default: '16'
            },
            radius: {
                type: String,
                required: false,
                default: '8'
            },
            fontClass: {
                type: String,
                required: false,
                default: 'text-small'
            }
        },
        data: function() {
            return {
                colorEnum: {
                    'gray': {background: '#E2E4E8', icon: '#81868D'},
                    // add more colors when needed
                }
            };
        },
        computed: {
            badgeStyles() {
                return {
                    width: `${this.width}px`,
                    height: `${this.height}px`,
                    borderRadius: `${this.radius}px`,
                    backgroundColor: this.colorEnum[this.color]?.background || this.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 8px',
                };
            },
            iconStyles() {
                return {
                    color: this.colorEnum[this.color]?.icon || this.color,
                    fontSize: `${this.iconSize}px`,
                    marginRight: '4px',
                };
            },
            fontStyles() {
                return {
                    color: this.colorEnum[this.color]?.icon || this.color,
                };
            }
        },
        template: `<div :style="badgeStyles">
                        <i :class="icon" :style="iconStyles"></i>
                        <span :class="fontClass" :style="fontStyles">{{ label }}</span>
                    </div>`,
    }));

    Vue.component("cly-content-steps", countlyVue.components.create({
        props: {
            header: {
                type: String,
                required: false,
                default: null
            },
        },
        data() {
            return {
                activeSection: ["section"]
            };
        },
        methods: {
        },
        template: `
            <div class="cly-vue-content-builder__layout-steps">
                <div>
                    <el-collapse v-model="activeSection">
                        <el-collapse-item :title="header" name="section">
                            <slot name="content-builder-layout-steps"></slot>
                        </el-collapse-item>
                    </el-collapse>  
                </div>
            </div>
        `,
    }));

    Vue.component("cly-content-step", countlyVue.components.create({
        props: {
            value: {
                type: [String, Number, Boolean, Object],
                default: null
            },
            subHeader: {
                type: String,
                required: false,
                default: null
            },
            label: {
                type: String,
                required: false,
                default: null
            },
            inputType: {
                type: String,
                required: false,
                default: 'text'
            },
            options: {
                type: Array,
                required: false,
                default: () => []
            },
            position: {
                type: String,
                required: false,
                default: 'horizontal'
            },
            width: {
                type: String,
                required: false,
                default: null
            },
            inputProps: {
                type: Object,
                required: false,
                default: () => ({})
            }
        },
        data() {
            return {
                localValue: this.value,
            };
        },
        watch: {
            value: function(newValue) {
                this.localValue = newValue;
            },
            localValue: function(newValue) {
                this.$emit('input', newValue);
            }
        },
        methods: {
            updateValue: function(id, newValue) {
                this.$set(this.localValues, id, newValue);
                this.$emit('input', { ...this.localValues });
            },
            getComponentType: function(type) {
                const mapping = {
                    dropdown: 'el-select',
                    input: 'el-input',
                    switch: 'el-switch',
                    'color-picker': 'cly-colorpicker',
                    'input-number': 'el-input-number',
                };
                return mapping[type] || 'div';
            }
        },
        created: function() {
        },
        template: `
            <div class="cly-vue-content-builder__layout-step">
                <div v-if="subHeader" class="cly-vue-content-builder__layout-step__sub-header color-cool-gray-50">{{ subHeader }}</div>
                <div class="cly-vue-content-builder__layout-step__element bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center" :class="{'bu-is-flex-direction-column bu-is-align-items-baseline': position !== 'horizontal' }" :style="[position !== 'horizontal' ? {'gap': '8px'}: {}]">
                    <div v-if="label" class="cly-vue-content-builder__layout-step__label">{{ label }}</div>
                    <slot name="content-builder-layout-step">
                        <component
                            :is="getComponentType(inputType)"
                            v-bind="inputProps"
                            v-model="localValue"
                            @input="updateValue"
                            class="cly-vue-content-builder__layout-step__component"
                            :style="[ position !== 'horizontal' ? {\'width\':  \'100%\'} : {\'width\': width + \'px\'}]"
                        >
                        <template v-if="inputProps && inputProps.append" v-slot:append>{{inputProps.append}}</template>
                        <el-option
                            v-if="inputType === 'dropdown'"
                            v-for="option in options"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                            class="cly-vue-content-builder__layout-step__option"
                        ></el-option>
                        </component>
                    </slot>
                </div>
            </div>
            `,
    }));

    Vue.component("cly-option-swapper", countlyVue.components.BaseComponent.extend({
        mixins: [countlyVue.mixins.i18n],
        props: {
            value: {
                type: [String, Number],
                default: null
            },
            items: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            activeColorCode: {
                type: String,
                default: '#0166D6'
            },
            width: {
                type: String,
                default: '100'
            }
        },
        data: function() {
            return {
                selectedValue: this.items[0].value || 0
            };
        },
        methods: {
            numberChange: function(val) {
                this.selectedValue = val;
                this.$emit('input', this.selectedValue);
            }
        },
        created: function() {
            this.selectedValue = this.value || this.items[0].value || 0;
        },
        template: '<div>\
                        <div class="bu-is-flex cly-option-swapper" :style="{\'width\': width + \'px\'}">\
                            <div v-for="(item, index) in items" :key="item.value" class="cly-option-swapper__each-box-wrapper">\
                                <div :style="item.value === selectedValue ? {\'background-color\': activeColorCode } : {}" :class="{ \'cly-option-swapper__active \': item.value === selectedValue, \'cly-option-swapper__first\' : index === 0, \'cly-option-swapper__last\' : index === (items.length - 1) }" class="cly-option-swapper__each" @click="numberChange(item.value)">\
                                    <i v-if="item.icon" :class="item.icon" :style="item.value === selectedValue ? {\'color\': \'#0166d6\' } : {\'color\': \'#000\' }"></i>\
                                    <span v-else :style="item.value === selectedValue ? {\'color\': \'#0166d6\' } : {\'color\': \'#000\' }" class="text-medium">{{ item.text }}</span>\
                                </div>\
                            </div>\
                        </div>\
                  </div>'
    }));

    Vue.component("cly-device-selector", countlyVue.components.BaseComponent.extend({
        props: {
            value: {
                type: String,
                default: null
            },
            selectedBackground: {
                type: String,
                default: '#383A3F'
            },
            width: {
                type: String,
                default: '108px'
            },
            showDesktop: {
                type: Boolean,
                default: true
            },
            showTablet: {
                type: Boolean,
                default: true
            },
            showMobile: {
                type: Boolean,
                default: true
            }
        },
        computed: {
            selectedDevice: {
                get() {
                    return this.value;
                },
                set(newValue) {
                    this.$emit('input', newValue);
                }
            }
        },
        template: `
            <div class="cly-vue-device-selector bu-is-flex bu-is-justify-content-space-between" :style="{ width: width }">
                <div v-if="showMobile" 
                     @click="selectedDevice = 'mobile'" 
                     :style="{ backgroundColor: selectedDevice === 'mobile' ? selectedBackground : 'transparent' }"
                     :class="[selectedDevice === 'mobile' ? 'color-white' : '']"
                     class="cly-vue-device-selector__device bu-p-2">
                    <i class="cly-io cly-io-device-mobile"></i>
                </div>
                <div v-if="showTablet" 
                     @click="selectedDevice = 'tablet'" 
                     :style="{ backgroundColor: selectedDevice === 'tablet' ? selectedBackground : 'transparent' }"
                     :class="[selectedDevice === 'tablet' ? 'color-white' : '']"
                     class="cly-vue-device-selector__device bu-p-2">
                    <i class="cly-io cly-io-device-tablet"></i>
                </div>
                <div v-if="showDesktop" 
                     @click="selectedDevice = 'desktop'" 
                     :style="{ backgroundColor: selectedDevice === 'desktop' ? selectedBackground : 'transparent' }"
                     :class="[selectedDevice === 'desktop' ? 'color-white' : '']"
                     class="cly-vue-device-selector__device bu-p-2">
                    <i class="cly-io cly-io-desktop-computer"></i>
                </div>
            </div>
        `
    }));
}(window.countlyVue = window.countlyVue || {}));
