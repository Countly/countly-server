<template>
    <div class="cly-vue-color-picker">
        <div
            class="cly-vue-color-picker__input-container"
            :data-test-id="testId"
            @click.stop="onInputContainerClick"
        >
            <div
                class="cly-vue-color-picker__input-drop-container"
                :data-test-id="testId + '-cly-color-picker-img-wrapper'"
                :style="dropStyles"
            >
                <img
                    class="cly-vue-color-picker__input-drop"
                    :src="'images/icons/blob.svg'"
                />
            </div>
            <input
                v-model="inputValue"
                class="cly-vue-color-picker__input"
                :class="{ 'cly-vue-color-picker__input--new-ui': isNewUIApplied }"
                type="text"
            />
            <div
                v-if="!isNewUIApplied"
                class="cly-vue-color-picker__input-arrow"
                :class="{ 'cly-vue-color-picker__input-arrow--open': isOpened }"
            >
                <i class="cly-is cly-is-arrow-drop-up cly-vue-color-picker__input-arrow-icon-open" />
                <i class="cly-is cly-is-arrow-drop-down cly-vue-color-picker__input-arrow-icon-closed" />
            </div>
        </div>
        <div
            v-if="isOpened"
            v-click-outside="onClickOutside"
            class="cly-vue-color-picker__body"
            :class="bodyClasses"
        >
            <picker
                class="cly-vue-color-picker__picker"
                :disable-fields="isNewUIApplied"
                :preset-colors="[]"
                ref="pickerComponent"
                :value="pickerColor"
                @input="onPickerInput"
            />
            <div
                v-if="isNewUIApplied"
                class="cly-vue-color-picker__color-inputs-container"
            >
                <div class="cly-vue-color-picker__color-inputs-wrapper">
                    <el-input
                        v-model="colorAlpha"
                        class="cly-vue-color-picker__color-input cly-vue-color-picker__color-input--alpha"
                        max="100"
                        min="0"
                        type="number"
                    >
                        <template #append>
                            <span>%</span>
                        </template>
                    </el-input>
                    <el-input
                        v-model="hexColor"
                        class="cly-vue-color-picker__color-input cly-vue-color-picker__color-input--hex"
                        :test-id="testId + '-hex-input'"
                    >
                        <template #prepend>
                            <span>#</span>
                        </template>
                    </el-input>
                </div>
                <div class="cly-vue-color-picker__color-input-rgb">
                    <el-input
                        v-for="key in Object.keys(rgbColor || {})"
                        :key="`rgb-input-for-${key}`"
                        max="255"
                        min="0"
                        type="number"
                        :value="rgbColor[key]"
                        @input="onRGBInput(key, $event)"
                    >
                        <template #prepend>
                            <span>{{ key }}</span>
                        </template>
                    </el-input>
                </div>
            </div>
            <div class="cly-vue-color-picker__buttons-container">
                <cly-button
                    class="cly-vue-color-picker__button"
                    :data-test-id="testId + '-reset-button'"
                    :label="$i18n('common.reset')"
                    skin="light"
                    @click="onResetClick"
                />
                <cly-button
                    class="cly-vue-color-picker__button"
                    :data-test-id="testId + '-cancel-button'"
                    :label="$i18n('common.cancel')"
                    skin="light"
                    @click="onCancelClick"
                />
                <cly-button
                    class="cly-vue-color-picker__button"
                    :data-test-id="testId + '-confirm-button'"
                    :label="$i18n('common.confirm')"
                    @click="onConfirmClick"
                    skin="green"
                />
            </div>
        </div>
    </div>
</template>

<script>
import _ from 'underscore';
import { Sketch } from 'vue-color';

const HEX_COLOR_REGEX = new RegExp('^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$', 'i');
const COLOR_ALPHA = 'alpha';
const COLOR_FORMAT_HEX = 'hex';
const COLOR_FORMAT_RGB = 'rgb';

export default {
    components: {
        picker: Sketch
    },
    props: {
        newUI: {
            type: Boolean,
            default: false
        },
        placement: {
            type: String,
            default: 'left'
        },
        resetValue: {
            type: [String, Object],
            default: '#FFFFFF'
        },
        testId: {
            type: String,
            default: 'cly-colorpicker-test-id'
        },
        value: {
            type: [String, Object],
            default: '#FFFFFF'
        }
    },
    emits: ['change', 'input'],
    data() {
        return {
            colorByFormats: {},
            isOpened: false,
            previousColor: null
        };
    },
    computed: {
        bodyClasses() {
            return {
                [`cly-vue-color-picker__body--${this.placement}`]: true,
                'cly-vue-color-picker__body--new-ui': this.isNewUIApplied
            };
        },
        colorAlpha: {
            get() {
                const alpha = typeof this.colorByFormats[COLOR_ALPHA] === 'number' ?
                    this.colorByFormats[COLOR_ALPHA] :
                    0;
                return Math.round(100 * alpha);
            },
            set(value) {
                const valueAsNumber = +value;
                if (valueAsNumber >= 0 && valueAsNumber <= 100) {
                    this.colorByFormats[COLOR_ALPHA] = valueAsNumber ? valueAsNumber / 100 : 0;
                }
            }
        },
        dropStyles() {
            return { backgroundColor: `rgba(${Object.values(this.pickerColor).join(', ')})` };
        },
        hexColor: {
            get() {
                const hexColor = this.colorByFormats[COLOR_FORMAT_HEX];
                return hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
            },
            set(value) {
                this.colorByFormats[COLOR_FORMAT_HEX] = value;
            }
        },
        inputValue: {
            get() {
                return this.rgbToHex(this.pickerColor);
            },
            set(value) {
                if (value.match(HEX_COLOR_REGEX)) {
                    this.pickerColor = this.hexToRgb(value, true);
                }
            }
        },
        isNewUIApplied() {
            return this.newUI;
        },
        pickerColor: {
            get() {
                return this.hexToRgb(this.value || this.resetValue, true);
            },
            set(rgbColor) {
                this.$emit('input', this.rgbToHex(rgbColor, true));
            }
        },
        rgbColor: {
            get() {
                return this.colorByFormats[COLOR_FORMAT_RGB];
            },
            set(value) {
                this.colorByFormats[COLOR_FORMAT_RGB] = JSON.parse(JSON.stringify(value));
            }
        }
    },
    watch: {
        [`colorByFormats.${COLOR_ALPHA}`]: {
            handler(value) {
                if (typeof value === 'number') {
                    this.pickerColor = this.rgbColor;
                }
            }
        },
        [`colorByFormats.${COLOR_FORMAT_HEX}`]: {
            handler(value) {
                if (value) {
                    const hexValue = `#${value}`;
                    if (hexValue.match(HEX_COLOR_REGEX)) {
                        this.pickerColor = this.hexToRgb(hexValue);
                    }
                }
            }
        },
        [`colorByFormats.${COLOR_FORMAT_RGB}`]: {
            handler(value) {
                if (value) {
                    this.pickerColor = value;
                }
            }
        },
        isOpened(value) {
            if (value) {
                this.previousColor = JSON.parse(JSON.stringify(this.value));
            }
        },
        value: {
            handler(value) {
                if (value) {
                    this.setPickerInputValues();
                }
            },
            immediate: true
        }
    },
    methods: {
        closePicker() {
            this.isOpened = false;
        },
        hexToRgb(hex, includeAlpha = false) {
            let hexString = hex.replace('#', '');
            if (hexString.length === 3) {
                hexString = hexString.split('').map(c => c + c).join('');
            }
            return {
                r: parseInt(hexString.slice(0, 2), 16) || 0,
                g: parseInt(hexString.slice(2, 4), 16) || 0,
                b: parseInt(hexString.slice(4, 6), 16) || 0,
                a: includeAlpha && hexString.length === 8 ? parseInt(hexString.slice(6, 8), 16) / 255 : 1
            };
        },
        onCancelClick() {
            this.inputValue = this.previousColor;
            this.closePicker();
        },
        onClickOutside() {
            this.closePicker();
        },
        onConfirmClick() {
            this.$emit('change', this.inputValue);
            this.closePicker();
        },
        onInputContainerClick() {
            this.isOpened = true;
        },
        onPickerInput(color) {
            const { a = 0, ...rgb } = color.rgba;
            const alpha = Math.round(a * 100);
            if (alpha !== this.colorAlpha) {
                this.colorAlpha = alpha;
            }
            if (!_.isEqual(this.rgbColor, rgb)) {
                this.pickerColor = rgb;
            }
        },
        onResetClick() {
            this.inputValue = this.resetValue;
            this.closePicker();
        },
        onRGBInput(key, value) {
            this.rgbColor = JSON.parse(JSON.stringify({
                ...this.rgbColor,
                [key]: +value
            }));
        },
        rgbToHex(rgbColor, includeAlpha = false) {
            const { r, g, b } = rgbColor || {};
            const hexString = `#${this.valueToHex(r)}${this.valueToHex(g)}${this.valueToHex(b)}`;
            const opacity = this.colorAlpha ? Math.round((this.colorAlpha / 100) * 255) : 0;
            return `${hexString}${includeAlpha ? this.valueToHex(opacity) : ''}`;
        },
        setPickerInputValues() {
            const { a, ...rgb } = this.pickerColor;
            if (!_.isEqual(this.rgbColor, rgb)) {
                this.colorByFormats = JSON.parse(JSON.stringify({
                    [COLOR_ALPHA]: a,
                    [COLOR_FORMAT_RGB]: rgb,
                    [COLOR_FORMAT_HEX]: this.rgbToHex(rgb)
                }));
            }
        },
        valueToHex(value) {
            const hex = value.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }
    }
};
</script>
