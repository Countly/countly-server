<template>
    <div
        class="cly-vue-content-builder-sidebar-input"
        :class="{
            'cly-vue-content-builder-sidebar-input--vertical': isVerticalInput,
            [`cly-vue-content-builder-sidebar-input--${size}`]: !!size
        }"
    >
        <label
            v-if="label"
            class="cly-vue-content-builder-sidebar-input__label"
            :data-test-id="'content-drawer-sidebar-step-' + $attrs.id + '-' + label.toLowerCase().replaceAll(' ', '-') + '-label'"
        >
            {{ label }}
            <i
                v-if="isLabelTooltipVisible"
                v-tooltip.left="labelTooltip"
                :class="labelIcon"
                :data-test-id="'content-drawer-sidebar-step-' + $attrs.id + '-' + label.toLowerCase().replaceAll(' ', '-') + '-label-tooltip'"
            />
        </label>
        <slot name="content-builder-layout-step">
            <component
                :is="mainComponent"
                v-bind="computedAttrs"
                v-loading="isUploadInput && loading"
                v-model="componentValue"
                v-tooltip.left="tooltip"
                class="cly-vue-content-builder-sidebar-input__component"
                :class="{
                    'cly-vue-content-builder-sidebar-input__component--slider': isSliderInput,
                    'cly-vue-content-builder-sidebar-input__component--upload': isUploadInput,
                    'cly-vue-content-builder-sidebar-input__component--image-radio': isImageRadioInput,
                    'cly-vue-content-builder-sidebar-input__component--list-block': isListBlockInput
                }"
                :controls="controlsProp"
                :disabled="disabled"
                :options="options"
                :test-id="'content-drawer-sidebar-step-' + $attrs.id"
                @add-asset="onAddAsset"
                @delete-asset="onDeleteAsset"
            >
                <template
                    v-if="isSuffixVisible"
                    #suffix
                >
                    {{ suffix }}
                </template>
                <template v-if="isComponentWithOptions">
                    <el-option
                        v-for="(option, index) in options"
                        :key="`content-builder-sidebar-input-option-${index}`"
                        class="cly-vue-content-builder-sidebar-input__option"
                        :label="option.label"
                        :value="option.value"
                        :test-id="$attrs.id"
                    />
                </template>
                <template v-if="isUploadInput">
                    <img
                        v-if="value"
                        class="cly-vue-content-builder-sidebar-input__upload-value"
                        :src="value"
                    >
                    <i
                        v-else
                        class="cly-io cly-io-photograph cly-vue-content-builder-sidebar-input__upload-placeholder"
                    />
                    <div class="cly-vue-content-builder-sidebar-input__upload-actions">
                        <el-button
                            class="cly-vue-content-builder-sidebar-input__upload-action"
                            icon="cly-io cly-io-upload"
                            type="info"
                            @click.stop="onUploadAddButtonClick"
                        />
                        <el-button
                            class="cly-vue-content-builder-sidebar-input__upload-action"
                            icon="cly-io cly-io-trash"
                            type="info"
                            @click.stop="onUploadDeleteButtonClick"
                        />
                    </div>
                </template>
                <template v-else-if="isImageRadioInput">
                    <el-radio
                        v-for="option in options"
                        :key="`content-block-layout-${option.value}`"
                        border
                        class="cly-vue-content-builder-sidebar-input__image-radio"
                        :test-id="'content-layout-type-' + option.value.toLowerCase()"
                        :label="option.value"
                        :value="value"
                        @input="$emit('input', $event)"
                    >
                        <div
                            class="cly-vue-content-builder-sidebar-input__image-radio-content"
                            :class="{
                                'cly-vue-content-builder-sidebar-input__image-radio-content--disabled': option.disabled
                            }"
                        >
                            <div class="square-button-preview">
                                <img :src="option.src">
                            </div>
                            <div class="cly-vue-content-builder-sidebar-input__image-radio-content-label">
                                {{ option.label }}
                            </div>
                        </div>
                    </el-radio>
                </template>
            </component>
            <div
                v-if="isSuffixVisible && type === 'number'"
                class="cly-vue-content-builder-sidebar-input__number-input-suffix"
            >
                {{ suffix }}
            </div>
        </slot>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../../mixins/base.js';
import countlyCommon from '../../countly/countly.common.js';

const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_COLOR_PICKER = 'color-picker';
const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DROPDOWN = 'dropdown';
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

const COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE = {
    [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_COLOR_PICKER]: 'cly-colorpicker',
    [COUNTLY_CONTENT_SIDEBAR_INPUT_COMPONENT_BY_TYPE_DROPDOWN]: 'el-select',
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

export default {
    mixins: [BaseComponentMixin],
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
    data() {
        return {
            textareaExtensions: [
                new window.ElementTiptap.Doc(),
                new window.ElementTiptap.Text(),
                new window.ElementTiptap.Paragraph(),
                new window.ElementTiptap.TextColor({colors: countlyCommon.GRAPH_COLORS}),
                new window.ElementTiptap.FontType({
                    fontTypes: {
                        Inter: 'Inter',
                        Lato: 'Lato',
                        Oswald: 'Oswald',
                        'Roboto-Mono': 'Roboto-Mono',
                        Ubuntu: 'Ubuntu'
                    }
                }),
                new window.ElementTiptap.FontSize({
                    fontSizes: ['8', '10', '12', '14', '16', '18', '20', '24', '30', '36', '48', '60', '72', '96']
                }),
                new window.ElementTiptap.LineHeight(),
                new window.ElementTiptap.Bold(),
                new window.ElementTiptap.Italic(),
                new window.ElementTiptap.Underline(),
                new window.ElementTiptap.ListItem(),
                new window.ElementTiptap.BulletList(),
                new window.ElementTiptap.OrderedList(),
                new window.ElementTiptap.FormatClear(),
                new window.ElementTiptap.History()
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
    }
};
</script>
