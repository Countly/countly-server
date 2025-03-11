/* global Vue, CV, countlyCommon */
(function(countlyVue) {
    Vue.component("cly-content-layout", countlyVue.components.create({
        template: CV.T('/javascripts/countly/vue/templates/content/content.html'),

        props: {
            backgroundColor: {
                default: null,
                type: String
            },

            popperClass: {
                default: null,
                type: String
            }
        },

        computed: {
            containerClass() {
                return this.popperClass || 'cly-vue-content-builder__layout-main';
            }
        }
    }));

    Vue.component("cly-content-header", countlyVue.components.create({
        template: CV.T('/javascripts/countly/vue/templates/content/content-header.html'),

        props: {
            backgroundColor: {
                default: '#ffffff',
                type: String
            },

            closeButton: {
                default: true,
                type: Boolean
            },

            createdBy: {
                default: null,
                type: String,
            },

            disableSaveButton: {
                default: false,
                type: Boolean
            },

            hideSaveButton: {
                default: false,
                type: Boolean
            },

            isToggleDisabled: {
                default: false,
                type: Boolean
            },

            options: {
                default: () => ([]),
                type: Array
            },

            saveButtonLabel: {
                default: CV.i18n('common.save'),
                type: String
            },

            status: {
                default: () => ({
                    label: 'Status',
                    mode: 'primary',
                    show: false
                }),
                type: Object
            },

            tabs: {
                default: () => [],
                type: Array
            },

            toggle: {
                default: false,
                type: Boolean
            },

            toggleTooltip: {
                type: String
            },

            toggleValue: {
                default: false,
                type: Boolean
            },

            value: {
                required: true,
                type: String
            },

            valueMaxLength: {
                default: 50,
                type: Number
            },

            version: {
                default: null,
                type: String
            }
        },

        emits: [
            'close',
            'handle-command',
            'input',
            'save',
            'switch-toggle',
            'tab-change'
        ],

        data: () => ({
            currentTab: null,

            isReadonlyInput: true
        }),

        computed: {
            activeTab: {
                get() {
                    return this.currentTab || this.tabs[0]?.value;
                },
                set(value) {
                    this.currentTab = value;
                    this.$emit('tab-change', value);
                }
            },

            closeButtonIcon() {
                return this.closeButton ? 'cly-io-x' : 'cly-io-arrow-sm-left';
            },

            dynamicTabsCustomStyle() {
                return `background-color: ${this.backgroundColor}`;
            },

            inputTooltip() {
                return this.localValue && this.localValue.length > 30 ? this.localValue : null;
            },

            isOptionsButtonVisible() {
                return !!this.options.length;
            },

            localValue: {
                get() {
                    return countlyCommon.unescapeHtml(this.value);
                },
                set(value) {
                    this.$emit('input', value);
                }
            },

            toggleLocalValue: {
                get() {
                    return this.toggleValue;
                },
                set(value) {
                    this.$emit('switch-toggle', value);
                }
            }
        },

        methods: {
            onCloseIconClick() {
                this.$emit('close');
            },

            onCommand(event) {
                this.$emit('handle-command', event);
            },

            onInputBlur() {
                this.toggleInputReadonlyState();
            },

            onInputContainerClick() {
                this.toggleInputReadonlyState();
            },

            onInputKeydown() {
                this.toggleInputReadonlyState();
            },

            onSaveButtonClick() {
                this.$emit('save');
            },

            toggleInputReadonlyState() {
                this.isReadonlyInput = !this.isReadonlyInput;
            }
        }
    }));

    Vue.component("cly-content-body", countlyVue.components.create({
        props: {
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
                isCollapsed: false,
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
                    this.isCollapsed = !this.isCollapsed;
                }
            },
            onViewEntered: function() { //?
                if (this.$refs.rootEl) {
                    this.$refs.rootEl.focus();
                }
            }
        },
        created: function() {
        }
    }));

    Vue.component("cly-status-badge", countlyVue.components.create({
        props: {
            mode: {
                type: String,
                required: true,
                default: 'primary',
                validator: function(value) {
                    return ['primary', 'secondary'].includes(value);
                }
            },
            label: {
                type: String,
                required: false,
                default: 'Status'
            }
        },
        data: function() {
            return {
                modeConfig: {
                    primary: { background: '#E2E4E8', color: '#81868D', icon: 'cly-is cly-is-status' },
                    secondary: { background: '#EBFAEE', color: '#12AF51', icon: 'cly-is cly-is-status' }
                    // Add more modes here if needed
                }
            };
        },
        computed: {
            currentConfig() {
                return this.modeConfig[this.mode];
            },
            badgeStyles() {
                return {
                    height: '16px',
                    borderRadius: '8px',
                    backgroundColor: this.currentConfig.background,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 8px',
                };
            },
            iconStyles() {
                return {
                    color: this.currentConfig.color,
                    fontSize: '8px',
                    marginRight: '4px',
                };
            },
            fontStyles() {
                return {
                    color: this.currentConfig.color,
                };
            }
        },
        template: `
            <div :style="badgeStyles">
                <i :class="currentConfig.icon" :style="iconStyles"></i>
                <span class="text-small" :style="fontStyles">{{ label }}</span>
            </div>
        `,
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


    // CONSTANTS

    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_COLOR_PICKER = 'color-picker';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DROPDOWN = 'dropdown';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_INPUT = 'input';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_NUMBER = 'number';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SLIDER = 'slider';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWAPPER = 'swapper';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWITCH = 'switch';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_TAB = 'tab';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_UPLOAD = 'upload';

    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE = {
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_COLOR_PICKER]: 'cly-colorpicker',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DROPDOWN]: 'el-select',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_INPUT]: 'el-input',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_NUMBER]: 'el-input-number',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SLIDER]: 'el-slider',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWAPPER]: 'cly-option-swapper',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWITCH]: 'el-switch',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_TAB]: 'div',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_UPLOAD]: 'el-upload'
    };

    const COUNTLY_CONTENT_SIDEBAR_INPUT_PLACEMENT_HORIZONTAL = 'horizontal';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_PLACEMENT_VERTICAL = 'vertical';

    Vue.component("cly-content-builder-sidebar-input", countlyVue.components.create({
        props: {
            componentTooltip: {
                default: null,
                type: String
            },

            disabled: {
                default: false,
                type: Boolean
            },

            label: {
                default: null,
                type: String
            },

            labelIcon: {
                default: 'cly-io cly-io-question-mark-circle',
                type: String
            },
            labelTooltip: {
                default: null,
                type: String
            },

            options: {
                default: () => null,
                type: Array
            },

            placement: {
                default: COUNTLY_CONTENT_SIDEBAR_INPUT_PLACEMENT_HORIZONTAL,
                type: String
            },

            position: {
                default: COUNTLY_CONTENT_SIDEBAR_INPUT_PLACEMENT_HORIZONTAL,
                type: String
            },

            subHeader: {
                default: null,
                type: String
            },

            suffix: {
                default: null,
                type: String
            },

            type: {
                default: COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_INPUT,
                type: String
            },

            value: {
                default: null,
                type: [String, Number, Boolean, Object]
            },

            size: {
                default: null,
                type: String
            },

            withComponentTooltip: {
                default: false,
                type: Boolean
            },

            withLabelTooltip: {
                default: false,
                type: Boolean
            }
        },

        emits: [
            'add-asset',
            'delete-asset',
            'input'
        ],

        computed: {
            componentValue: {
                get() {
                    if (this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWITCH) {
                        return !!this.value;
                    }

                    if (this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_INPUT) {
                        return countlyCommon.unescapeHtml(this.value) || '';
                    }

                    if (this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_NUMBER) {
                        return +this.value || 0;
                    }

                    return this.value || null;
                },
                set(newValue) {
                    this.$emit('input', newValue);
                }
            },

            computedAttrs() {
                if (this.isUploadInput) {
                    return {
                        action: '',
                        drag: true,
                        multiple: false,
                        showFileList: false,
                        ...this.$attrs
                    };
                }

                return this.$attrs;
            },

            controlsProp() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_NUMBER ? false : null;
            },

            isDropdownInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DROPDOWN;
            },

            isComponentWithOptions() {
                return this.isDropdownInput && Array.isArray(this.options) && this.options.length;
            },

            isLabelTooltipVisible() {
                return this.withLabelTooltip && this.labelTooltip;
            },

            isSliderInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SLIDER;
            },

            isSuffixVisible() {
                return (
                    this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_INPUT ||
                    this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_NUMBER
                ) && this.suffix;
            },

            isSwapperInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWAPPER;
            },

            isUploadInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_UPLOAD;
            },

            isVerticalInput() {
                return this.position === COUNTLY_CONTENT_SIDEBAR_INPUT_PLACEMENT_VERTICAL;
            },

            mainComponent() {
                return COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE[this.type] || 'div';
            },

            tooltip() {
                if (this.withComponentTooltip) {
                    return this.componentTooltip || null;
                }
                return null;
            }
        },

        methods: {
            onUploadAddButtonClick() {
                this.$emit('add-asset');
            },

            onUploadDeleteButtonClick() {
                this.$emit('delete-asset');
            }
        },

        template: CV.T('/javascripts/countly/vue/templates/content/UI/content-sidebar-input.html')
    }));

    Vue.component("cly-option-swapper", countlyVue.components.create({
        template: CV.T('/javascripts/countly/vue/templates/UI/option-swapper.html'),

        props: {
            disabled: {
                default: false,
                type: Boolean
            },

            highlightOnSelect: {
                default: true,
                type: Boolean
            },

            options: {
                default: () => [],
                type: Array
            },

            value: {
                default: null,
                type: [String, Number]
            }
        },

        emits: [
            'input'
        ],

        mixins: [countlyVue.mixins.i18n],

        computed: {
            selectedOption: {
                get() {
                    return this.value || this.options[0].value;
                },
                set(value) {
                    this.$emit('input', value);
                }
            }
        },

        methods: {
            onOptionClick: function(option) {
                if (!option.disabled) {
                    this.selectedOption = option.value;
                }
            }
        }
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
