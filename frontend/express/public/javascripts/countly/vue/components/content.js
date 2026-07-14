/* global Vue, CV, countlyCommon, ElementTiptap */
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

            saveButtonTooltip: {
                default: null,
                type: String
            },

            cooldownBadge: {
                default: () => ({ show: false }),
                type: Object
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
            'tab-change',
            'publish-button-click'
        ],

        data() {
            return {
                currentTab: null,
                isReadonlyInput: true,
                showActionsPopup: false
            };
        },

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

            localValue: {
                get() {
                    return countlyCommon.unescapeHtml(this.value);
                },
                set(value) {
                    this.$emit('input', value);
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

            onPublishButtonClick() {
                if (this.isToggleDisabled) {
                    this.$emit('publish-button-click');
                    return;
                }
                this.toggleLocalValue = !this.toggleLocalValue;
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
            },
            toolTipLeft: {
                type: String,
                required: false,
                default: 'Screens'
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
                    return ['primary', 'secondary', 'info', 'warning'].includes(value);
                }
            },
            label: {
                type: String,
                required: false,
                default: 'Status'
            },
            showIcon: {
                type: Boolean,
                required: false,
                default: true
            }
        },
        data: function() {
            return {
                modeConfig: {
                    primary: { background: '#E2E4E8', color: '#81868D', icon: 'cly-is cly-is-status' },
                    secondary: { background: '#EBFAEE', color: '#12AF51', icon: 'cly-is cly-is-status' },
                    info: { background: '#E1EFFF', color: '#0166D6', icon: 'cly-is cly-is-status' },
                    warning: { background: '#FFF4E1', color: '#D97706', icon: 'cly-is cly-is-status' },
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
                <i v-if="showIcon" :class="currentConfig.icon" :style="iconStyles"></i>
                <span class="text-small" :style="fontStyles">{{ label }}</span>
            </div>
        `,
    }));

    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_COLOR_PICKER = 'color-picker';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DROPDOWN = 'dropdown';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DYNAMIC_PARAMS = 'dynamic-params';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_IMAGE_RADIO = 'image-radio';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_INPUT = 'input';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK = 'list-block';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_NUMBER = 'number';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SLIDER = 'slider';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWAPPER = 'swapper';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWITCH = 'switch';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_TAB = 'tab';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_TEXTAREA = 'textarea';
    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_UPLOAD = 'upload';

    Vue.component('cly-content-builder-sidebar-step', countlyVue.components.create({
        props: {
            header: {
                default: null,
                type: String
            },

            collapsible: {
                default: false,
                type: Boolean
            },

            inputs: {
                default: () => [],
                type: Array
            }
        },

        emits: [
            'add-asset',
            'delete-asset',
            'input-value-change',
            'upload-asset'
        ],

        data() {
            return {
                section: ['body']
            };
        },

        computed: {
            bodyComponent() {
                return this.collapsible ? 'el-collapse-item' : 'div';
            },

            bodyComponentProps() {
                if (!this.collapsible) {
                    return null;
                }

                return {
                    name: 'body',
                    testId: this.dataTestId,
                    title: this.header
                };
            },

            dataTestId() {
                return `content-drawer-sidebar-step-${this.header.toLowerCase().replaceAll(' ', '-')}`;
            },

            formattedInputs() {
                if (this.inputs.length) {
                    return this.inputs.map(input => ({
                        ...input,
                        ...!!input.subHeader && {
                            hasSubHeader: true,
                            dataTestId: `content-drawer-sidebar-step-${input.subHeader.toLowerCase().replaceAll(' ', '-')}-label`
                        }
                    }));
                }

                return [];
            },

            wrapperComponent() {
                return this.collapsible ? 'el-collapse' : 'div';
            }
        },

        methods: {
            onAddAsset(payload) {
                const { input, payload: eventPayload } = payload || {};
                const { id, key, type } = input || {};

                if (type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK) {
                    this.$emit('add-asset', eventPayload);
                }
                else {
                    this.$emit('add-asset', { id, key });
                }
            },

            onDeleteAsset(payload) {
                const { input, payload: eventPayload } = payload || {};
                const { id, key, type } = input || {};

                if (type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK) {
                    this.$emit('delete-asset', eventPayload);
                }
                else {
                    this.$emit('delete-asset', { id, key });
                }
            },

            onUploadAsset(payload) {
                this.$emit('upload-asset', payload);
            },

            onInputChange(payload) {
                const { input, payload: inputPayload } = payload || {};
                const { id, key, type } = input || {};

                if (type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK) {
                    this.$emit('input-value-change', inputPayload);
                }
                else {
                    this.$emit('input-value-change', {
                        id,
                        key,
                        value: inputPayload
                    });
                }
            }
        },

        template: CV.T('/javascripts/countly/vue/templates/content/UI/content-builder-sidebar-step.html'),
    }));


    // CONSTANTS

    const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE = {
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_COLOR_PICKER]: 'cly-colorpicker',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DROPDOWN]: 'el-select',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DYNAMIC_PARAMS]: 'cly-content-dynamic-params-input',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_IMAGE_RADIO]: 'div',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_INPUT]: 'el-input',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK]: 'cly-content-block-list-input',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_NUMBER]: 'el-input-number',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SLIDER]: 'el-slider',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWAPPER]: 'cly-option-swapper',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_SWITCH]: 'el-switch',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_TAB]: 'div',
        [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_TEXTAREA]: 'el-tiptap',
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
                default: 'ion ion-help-circled',
                type: String
            },

            labelTooltip: {
                default: null,
                type: String
            },

            loading: {
                default: false,
                type: Boolean
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

            size: {
                default: null,
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
                type: [String, Number, Boolean, Object, Array]
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
            'input',
            'upload-asset'
        ],

        data() {
            return {
                textareaExtensions: [
                    new ElementTiptap.Doc(),
                    new ElementTiptap.Text(),
                    new ElementTiptap.Paragraph(),
                    new ElementTiptap.TextColor({colors: countlyCommon.GRAPH_COLORS}),
                    new ElementTiptap.FontType({
                        fontTypes: {
                            Inter: 'Inter',
                            Lato: 'Lato',
                            Oswald: 'Oswald',
                            'Roboto-Mono': 'Roboto-Mono',
                            Ubuntu: 'Ubuntu'
                        }
                    }),
                    new ElementTiptap.FontSize({
                        fontSizes: ['8', '10', '12', '14', '16', '18', '20', '24', '30', '36', '48', '60', '72', '96']
                    }),
                    new ElementTiptap.LineHeight(),
                    new ElementTiptap.Bold(),
                    new ElementTiptap.Italic(),
                    new ElementTiptap.Underline(),
                    new ElementTiptap.ListItem(),
                    new ElementTiptap.BulletList(),
                    new ElementTiptap.OrderedList(),
                    new ElementTiptap.FormatClear(),
                    new ElementTiptap.History()
                ],
            };
        },

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

                    if (this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DYNAMIC_PARAMS) {
                        return countlyCommon.unescapeHtml(this.value) || '';
                    }

                    if (this.isListBlockInput) {
                        return null;
                    }

                    return this.value || null;
                },

                set(newValue) {
                    this.$emit('input', newValue);
                }
            },

            computedAttrs() {
                return {
                    ...this.$attrs,
                    ...this.isColorPickerInput && { newUI: true },
                    ...this.isTextareaInput && { extensions: this.textareaExtensions },
                    ...this.isUploadInput && {
                        action: '',
                        drag: true,
                        multiple: false,
                        showFileList: false
                    }
                };
            },

            controlsProp() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_NUMBER ? false : null;
            },

            isDropdownInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DROPDOWN;
            },

            isColorPickerInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_COLOR_PICKER;
            },

            isComponentWithOptions() {
                return this.isDropdownInput && Array.isArray(this.options) && this.options.length;
            },

            isImageRadioInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_IMAGE_RADIO;
            },

            isLabelTooltipVisible() {
                return this.withLabelTooltip && this.labelTooltip;
            },

            isListBlockInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_LIST_BLOCK;
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

            isTextareaInput() {
                return this.type === COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_TEXTAREA;
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
            onAddAsset(payload) {
                this.$emit('add-asset', payload);
            },

            onDeleteAsset(payload) {
                this.$emit('delete-asset', payload);
            },

            onUploadAddButtonClick() {
                this.$emit('add-asset');
            },

            onUploadDeleteButtonClick() {
                this.$emit('delete-asset');
            }
        },

        template: CV.T('/javascripts/countly/vue/templates/content/UI/content-sidebar-input.html')
    }));

    const DEFAULT_LIST_BLOCK_IMAGE_PLACEHOLDER_URL = '/content/images/fullscreenPlaceholderImage.png';

    Vue.component('cly-content-block-list-input', countlyVue.components.create({
        props: {
            blockInputs: {
                default: () => [],
                type: Array
            }
        },

        emits: [
            'add-asset',
            'delete-asset',
            'input'
        ],

        computed: {
            mappedBlockInputs() {
                return this.blockInputs.map(block => {
                    return block.map(blockInput => ({
                        ...blockInput,
                        ...(blockInput.id.includes('image') && !blockInput.value) && {
                            value: DEFAULT_LIST_BLOCK_IMAGE_PLACEHOLDER_URL
                        }
                    }));
                });
            }
        },

        methods: {
            onAddAsset(payload) {
                this.$emit('add-asset', payload);
            },

            onDeleteAsset(payload) {
                this.$emit('delete-asset', payload);
            },

            onInput(payload) {
                this.$emit('input', payload);
            }
        },

        template: CV.T('/javascripts/countly/vue/templates/content/UI/content-block-list-input.html'),
    }));

    // SER-2915: matches a full `{property|fallback|c}` placeholder value —
    // fallback may be empty ({property||c}), so the flag segment is unambiguous.
    const CONTENT_DYNAMIC_PARAM_PLACEHOLDER_RE = /^\{([^{}|]+)(?:\|([^{}|]*))?(?:\|(c))?\}$/;

    // SER-2915: parameter editor popover for URL/deep-link button actions in the
    // content builder — mirrors the push notifications Add User Property popover
    // (internal/external property tabs, property selector, capitalize switch and
    // fallback value) plus a parameter name input and a static value mode.
    // Confirming appends a `name={property|fallback|c}` (or `name=value`) query
    // parameter to the action URL; placeholders are resolved per targeted user
    // when the content is served. Every query parameter already present in the
    // URL is rendered as a highlighted chip that reopens the popover pre-filled
    // for editing, or removes the parameter via its close icon.
    Vue.component('cly-content-dynamic-params-input', countlyVue.components.create({
        props: {
            disabled: {
                default: false,
                type: Boolean
            },

            options: {
                default: () => [],
                type: Array
            },

            testId: {
                default: 'content-dynamic-params-input',
                type: String
            },

            value: {
                default: '',
                type: String
            }
        },

        emits: [
            'input'
        ],

        mixins: [countlyVue.mixins.i18n],

        data() {
            return {
                editingIndex: null,
                isPanelOpen: false,
                property: {
                    fallback: '',
                    isUppercase: false,
                    key: '',
                    staticValue: '',
                    value: ''
                },
                selectedPropertyCategory: 'internal'
            };
        },

        computed: {
            isConfirmDisabled() {
                if (!this.property.key.trim()) {
                    return true;
                }

                if (this.selectedPropertyCategory === 'static') {
                    return !this.property.staticValue.trim();
                }

                return !this.property.value;
            },

            panelTitle() {
                return this.editingIndex === null ?
                    this.i18n('content.dynamic-params.add-user-property') :
                    this.i18n('content.dynamic-params.edit-parameter');
            },

            propertyCategoryOptions() {
                return [
                    { label: this.i18n('content.dynamic-params.internal-properties'), value: 'internal' },
                    { label: this.i18n('content.dynamic-params.external-properties'), value: 'external' },
                    { label: this.i18n('content.dynamic-params.static-value'), value: 'static' }
                ];
            },

            // query parameters currently present in the URL, each rendered as a
            // clickable chip; isDynamic marks `{property|fallback|c}` placeholders
            urlQueryParams() {
                return this.parseUrl(this.value || '').params.map((pair) => {
                    const eqIndex = pair.indexOf('=');
                    const rawKey = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
                    const rawValue = eqIndex === -1 ? '' : pair.slice(eqIndex + 1);

                    return {
                        isDynamic: CONTENT_DYNAMIC_PARAM_PLACEHOLDER_RE.test(rawValue),
                        key: this.safeDecode(rawKey),
                        rawValue
                    };
                });
            }
        },

        methods: {
            buildParamValue() {
                if (this.selectedPropertyCategory === 'static') {
                    return encodeURIComponent(this.property.staticValue.trim());
                }

                // reserved characters would break placeholder/query string parsing
                const fallback = this.property.fallback.replace(/[{}|&=?#]/g, '');
                let placeholder = '{' + this.property.value;

                if (fallback || this.property.isUppercase) {
                    placeholder += '|' + fallback;
                }

                if (this.property.isUppercase) {
                    placeholder += '|c';
                }

                return placeholder + '}';
            },

            buildUrl(parsed) {
                return parsed.path + (parsed.params.length ? '?' + parsed.params.join('&') : '') + parsed.hash;
            },

            findPropertyOption(value) {
                for (let i = 0; i < (this.options || []).length; i++) {
                    const found = (this.options[i].options || []).find(option => option.value === value);

                    if (found) {
                        return found;
                    }
                }

                return null;
            },

            onAddButtonClick() {
                if (this.isPanelOpen) {
                    this.resetPanel();
                    return;
                }

                this.resetPanelState();
                this.isPanelOpen = true;
            },

            onCancel() {
                this.resetPanel();
            },

            onCategoryChange() {
                this.property.staticValue = '';
                this.property.value = '';
            },

            onConfirm() {
                if (this.isConfirmDisabled) {
                    return;
                }

                const pair = encodeURIComponent(this.property.key.trim()) + '=' + this.buildParamValue();
                const parsed = this.parseUrl(this.value || '');

                if (this.editingIndex !== null && this.editingIndex < parsed.params.length) {
                    parsed.params[this.editingIndex] = pair;
                }
                else {
                    parsed.params.push(pair);
                }

                this.$emit('input', this.buildUrl(parsed));
                this.resetPanel();
            },

            onParamChipClick(index) {
                if (this.disabled) {
                    return;
                }

                const param = this.urlQueryParams[index];

                if (!param) {
                    return;
                }

                this.resetPanelState();
                this.editingIndex = index;
                this.property.key = param.key;

                const match = param.rawValue.match(CONTENT_DYNAMIC_PARAM_PLACEHOLDER_RE);

                if (match) {
                    this.property.value = match[1];
                    this.property.fallback = match[2] || '';
                    this.property.isUppercase = !!match[3];
                    this.selectedPropertyCategory = this.findPropertyOption(match[1]) ? 'internal' : 'external';
                }
                else {
                    this.property.staticValue = this.safeDecode(param.rawValue);
                    this.selectedPropertyCategory = 'static';
                }

                this.isPanelOpen = true;
            },

            onParamChipRemove(index) {
                if (this.disabled) {
                    return;
                }

                const parsed = this.parseUrl(this.value || '');

                parsed.params.splice(index, 1);
                this.$emit('input', this.buildUrl(parsed));

                if (this.editingIndex === index) {
                    this.resetPanel();
                }
                else if (this.editingIndex !== null && this.editingIndex > index) {
                    this.editingIndex -= 1;
                }
            },

            onPropertySelect(value) {
                this.property.value = value;
            },

            parseUrl(url) {
                const hashIndex = url.indexOf('#');
                const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
                const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
                const queryIndex = base.indexOf('?');

                return {
                    hash,
                    params: queryIndex === -1 ? [] : base.slice(queryIndex + 1).split('&').filter(param => param !== ''),
                    path: queryIndex === -1 ? base : base.slice(0, queryIndex)
                };
            },

            resetPanel() {
                this.resetPanelState();
                this.isPanelOpen = false;
            },

            resetPanelState() {
                this.editingIndex = null;
                this.selectedPropertyCategory = 'internal';
                this.property = {
                    fallback: '',
                    isUppercase: false,
                    key: '',
                    staticValue: '',
                    value: ''
                };
            },

            safeDecode(value) {
                try {
                    return decodeURIComponent(value);
                }
                catch (error) {
                    return value;
                }
            }
        },

        template: CV.T('/javascripts/countly/vue/templates/content/UI/content-dynamic-params-input.html')
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
            },
            testId: {
                type: String,
                default: 'cly-option-swapper-test-id',
                required: false
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
                     class="cly-vue-device-selector__device bu-p-2" data-test-id="small-devices-button">
                    <i class="cly-io cly-io-device-mobile"></i>
                </div>
                <div v-if="showTablet" 
                     @click="selectedDevice = 'tablet'" 
                     :style="{ backgroundColor: selectedDevice === 'tablet' ? selectedBackground : 'transparent' }"
                     :class="[selectedDevice === 'tablet' ? 'color-white' : '']"
                     class="cly-vue-device-selector__device bu-p-2" data-test-id="medium-devices-button">
                    <i class="cly-io cly-io-device-tablet"></i>
                </div>
                <div v-if="showDesktop" 
                     @click="selectedDevice = 'desktop'" 
                     :style="{ backgroundColor: selectedDevice === 'desktop' ? selectedBackground : 'transparent' }"
                     :class="[selectedDevice === 'desktop' ? 'color-white' : '']"
                     class="cly-vue-device-selector__device bu-p-2" data-test-id="large-devices-button">
                    <i class="cly-io cly-io-desktop-computer"></i>
                </div>
            </div>
        `
    }));
}(window.countlyVue = window.countlyVue || {}));
