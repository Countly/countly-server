<template>
    <div
        class="cly-vue-content-builder-header"
        :style="{ backgroundColor }"
    >
        <div class="cly-vue-content-builder-header__left">
            <div
                class="cly-vue-content-builder-header__close-button"
                data-test-id="close-icon"
                @click="onCloseIconClick"
            >
                <i
                    class="cly-io color-warm-gray-60"
                    :class="closeButtonIcon"
                />
            </div>

            <div class="cly-vue-content-builder-header__info">
                <div
                    v-tooltip="inputTooltip"
                    class="cly-vue-content-builder-header__input-container"
                    data-test-id="content-header-input-container"
                    @click="onInputContainerClick"
                >
                    <el-input
                        v-model="localValue"
                        class="cly-vue-content-builder-header__input"
                        :class="{ 'cly-vue-content-builder-header__input--editing': !isReadonlyInput }"
                        test-id="content-header-input"
                        :maxlength="valueMaxLength"
                        :readonly="isReadonlyInput"
                        @blur="onInputBlur"
                        @keydown.enter.native="onInputKeydown"
                    />
                </div>
                <div class="cly-vue-content-builder-header__info-meta">
                    <div
                        v-if="version"
                        @click="$emit('version-click')"
                        class="cly-vue-content-builder-header__version cursor-pointer"
                    >
                        {{ version }}
                    </div>
                    <div class="cly-vue-content-builder-header__created-by" data-test-id="created-by-label">
                        {{ createdBy }}
                    </div>
                </div>
            </div>
        </div>
        <cly-dynamic-tabs
            v-if="tabs"
            v-model="activeTab"
            class="cly-vue-content-builder-header__tabs"
            :custom-style="dynamicTabsCustomStyle"
            no-history
            :tabs="tabs"
        />
        <div class="cly-vue-content-builder-header__actions">
            <cly-status-badge
                v-if="status.show"
                class="cly-vue-content-builder-header__badge"
                data-test-id="content-header-status-badge"
                :label="status.label"
                :mode="status.mode"
            />

            <el-button
                v-if="!hideSaveButton"
                id="journey-save-button"
                class="cly-vue-content-builder-header__save-button"
                data-test-id="content-header-save-button"
                :disabled="disableSaveButton"
                size="small"
                type="success"
                v-tooltip="saveButtonTooltip"
                @click="onSaveButtonClick"
            >
                {{ saveButtonLabel }}
            </el-button>
            <div
                v-if="toggle"
                style="display: inline-block; margin-left: 8px;"
            >
                <button
                    v-tooltip.down="toggleTooltip"
                    :class="[
                        'cly-vue-content-builder-header__save-button',
                        'el-button',
                        'el-button--small',
                        isToggleDisabled ? 'is-disabled' : '',
                        toggleLocalValue ? 'el-button--warning' : 'el-button--success'
                    ]"
                    :data-test-id="'journey-' + (toggleLocalValue ? 'Pause' : 'Publish').toLowerCase() + '-button'"
                    :disabled="false"
                    @click="onPublishButtonClick"
                >
                    <template v-if="toggleLocalValue">
                        <i class="cly-is cly-is-pause" style="margin-right: 4px;"></i>
                    </template>
                    {{ toggleLocalValue ? 'Pause': 'Publish' }}
                </button>
            </div>
            <cly-more-options
                v-if="isOptionsButtonVisible"
                class="cly-vue-content-builder-header__options-button"
                test-id="content-header"
                size="small"
                @command="onCommand"
            >

                <el-dropdown-item
                    v-for="(option, idx) in options"
                    :key="`cly-vue-content-builder-header-option-${idx}`"
                    class="cly-vue-content-builder-header__option"
                    :data-test-id="'more-button-option-' + option.value"
                    :command="option.value"
                    :disabled="option.disabled"
                >
                    <span class="cly-vue-content-builder-header__option-label">
                        {{ option.label }}
                    </span>
                </el-dropdown-item>
            </cly-more-options>
        </div>
    </div>
</template>

<script>
import { BaseComponentMixin } from '../../mixins/base.js';
import countlyCommon from '../../countly/countly.common.js';

export default {
    mixins: [BaseComponentMixin],
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
            default: 'Save',
            type: String
        },
        saveButtonTooltip: {
            default: null,
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
};
</script>
