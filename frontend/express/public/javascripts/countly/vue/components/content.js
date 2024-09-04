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
            value: {
                type: String,
                required: true
            },
            version: {
                type: String,
                required: false,
                default: null
            },
            createdBy: {
                type: String,
                required: false,
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
            saveButtonDisabled: {
                type: Boolean,
                required: false,
                default: false
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
                currentTab: this.tabs[0]?.value || null,
                localTitle: this.value,
                isEditing: !this.value,
                isActive: false
            };
        },
        watch: {
            value: function(newVal) {
                this.localTitle = newVal;
            },
            currentTab: function(newVal) {
                this.$emit('tab-change', newVal);
            }
        },
        methods: {
            toggleChanged(newValue) {
                this.console.log('toggleChanged');
                this.$emit('toggleChanged', newValue);
            },
            close: function() {
                this.$emit('close');
            },
            save: function() {
                this.$emit('save');
            },
            handleCommand: function(event) {
                this.$emit('handle-command', event);
            },
            handleDoubleClick: function() {
                this.isEditing = true;
            },
            finishEditing: function() {
                if (this.localTitle) {
                    this.isEditing = false;
                }
                if (this.localTitle !== this.value) {
                    this.$emit('input', this.localTitle);
                }
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
                isLeftSidebarHidden: this.hideLeftSidebar,
                scrollOps: {
                    vuescroll: {},
                    scrollPanel: {
                        initialScrollX: false
                    },
                    rail: {
                        gutterOfSide: "1px",
                        gutterOfEnds: "15px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: false
                    }
                },
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
            collapse: {
                type: Boolean,
                required: false,
                default: true
            }
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
                <div v-if="collapse">
                    <el-collapse v-model="activeSection">
                        <el-collapse-item :title="header" name="section">
                            <slot name="content-builder-layout-steps"></slot>
                        </el-collapse-item>
                    </el-collapse>  
                </div>
                <div v-else>
                    <div class="cly-vue-content-builder__layout-steps__header text-medium font-weight-bold">{{ header }}</div>
                    <slot name="content-builder-layout-steps"></slot>
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
                localValue: this.initializeLocalValue(),
            };
        },
        watch: {
            value: {
                handler: function(newValue) {
                    this.localValue = this.initializeLocalValue(newValue);
                },
                deep: true
            },
            localValue: {
                handler: function(newValue) {
                    this.$emit('input', newValue);
                },
                deep: true
            }
        },
        methods: {
            initializeLocalValue(val = this.value) {
                if (this.inputType === 'switch') {
                    return val === true;
                }
                return val !== undefined ? val : null;
            },
            updateValue: function(newValue) {
                this.localValue = newValue;
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
                <div v-if="subHeader" class="cly-vue-content-builder__layout-step__sub-header color-cool-gray-50 bu-mb-2">{{ subHeader }}</div>
                <div class="cly-vue-content-builder__layout-step__element bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center" :class="{'bu-is-flex-direction-column bu-is-align-items-baseline': position !== 'horizontal' }" :style="[position !== 'horizontal' ? {'gap': '8px'}: {}]">
                    <div v-if="label" class="cly-vue-content-builder__layout-step__label">{{ label }}</div>
                    <slot name="content-builder-layout-step">
                        <component
                            :is="getComponentType(inputType)"
                            v-bind="inputProps"
                            :value="localValue"
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
        watch: {
            value: function(value) {
                this.selectedValue = value;
            }
        },
        methods: {
            numberChange: function(item) {
                if (!item.disabled) {
                    this.selectedValue = item.value;
                    this.$emit('input', this.selectedValue);
                }
            }
        },
        created: function() {
            this.selectedValue = this.value || this.items[0].value || 0;
        },
        template: `
            <div>
                <div class="bu-is-flex cly-option-swapper" :style="{'width': width + 'px'}">
                    <div v-for="(item, index) in items" :key="item.value" class="cly-option-swapper__each-box-wrapper">
                        <div
                            :style="[
                                item.value === selectedValue && !item.disabled ? {'background-color': activeColorCode} : {},
                                item.disabled ? {'opacity': '0.5', 'cursor': 'not-allowed', 'background-color': '#E2E4E8'} : {}
                            ]"
                            :class="{
                                'cly-option-swapper__active': item.value === selectedValue && !item.disabled,
                                'cly-option-swapper__first': index === 0,
                                'cly-option-swapper__last': index === (items.length - 1),
                                'cly-option-swapper__disabled': item.disabled
                            }"
                            v-tooltip="item.tooltip"
                            class="cly-option-swapper__each"
                            @click="numberChange(item)"
                        >
                            <i v-if="item.icon"
                               :class="item.icon"
                               :style="[
                                   item.value === selectedValue && !item.disabled ? {'color': '#0166d6'} : {'color': '#000'},
                                   item.disabled ? {'color': '#999'} : {}
                               ]">
                            </i>
                            <span v-else
                                  :style="[
                                      item.value === selectedValue && !item.disabled ? {'color': '#0166d6'} : {'color': '#000'},
                                      item.disabled ? {'color': '#999'} : {}
                                  ]"
                                  class="text-medium"
                            >
                                {{ item.text }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `
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
