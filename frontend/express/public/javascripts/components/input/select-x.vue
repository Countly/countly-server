<template>
    <cly-dropdown
        class="cly-vue-select-x"
        :test-id="testId"
        ref="dropdown"
        :width="width"
        :placeholder="placeholder"
        :disabled="disabled"
        :pop-class="popClass"
        :popper-append-to-body="popperAppendToBody"
        v-bind="$attrs"
        v-on="$listeners"
        @show="handleDropdownShow"
        @hide="focusOnTrigger"
    >
        <template v-slot:trigger="dropdown">
            <slot name="trigger" :dropdown="dropdown">
                <el-select-head
                    v-if="isMultiple"
                    multiple
                    ref="trigger"
                    class="el-select-head"
                    :test-id="testId"
                    :disabled="disabled"
                    :opened="dropdown.visible"
                    :placeholder="placeholder"
                    :arrow="arrow"
                    :value="value"
                    :collapse-tags="collapseTags"
                    @change="commitValue"
                    :options-lookup="selectedOptions"
                ></el-select-head>
                <cly-input-dropdown-trigger
                    v-else
                    ref="trigger"
                    :test-id="testId"
                    :size="size"
                    :disabled="disabled"
                    :adaptive-length="adaptiveLength"
                    :min-width="minInputWidth"
                    :max-width="maxInputWidth"
                    :focused="dropdown.focused"
                    :opened="dropdown.visible"
                    :placeholder="placeholder"
                    :arrow="arrow"
                    :selected-options="selectedOptions"
                >
                    <template v-slot:prefix>
                        <slot name="label-prefix" :options="selectedOptions"></slot>
                    </template>
                </cly-input-dropdown-trigger>
            </slot>
        </template>
        <div class="cly-vue-select-x__pop" :class="popClasses">
            <div class="cly-vue-select-x__header">
                <div class="bu-level">
                    <div class="cly-vue-select-x__title" :data-test-id="testId + '-select-x-title'" v-if="title">{{ title }}</div>
                    <div class="bu-level-right text-small color-cool-gray-50 bu-pb-4" v-if="showSelectedCount">{{ selectedCountText }}</div>
                </div>
                <div class="cly-vue-select-x__header-slot" v-if="!!$scopedSlots.header">
                    <slot name="header" :active-tab-id="activeTabId" :tabs="publicTabs" :update-tab="updateTabFn"></slot>
                </div>
                <div class="bu-level">
                    <div class="bu-level-item" v-if="isSearchShown">
                        <el-input
                            v-show="showList"
                            ref="searchBox"
                            autocomplete="off"
                            :test-id="testId + '-search-box'"
                            :disabled="disabled"
                            v-model="searchQuery"
                            @keydown.native.esc.stop.prevent="doClose"
                            :placeholder="searchPlaceholder"
                        >
                            <i slot="prefix" :data-test-id="testId + '-search-icon'" class="el-input__icon el-icon-search"></i>
                        </el-input>
                    </div>
                    <slot name="action"></slot>
                </div>
            </div>
            <el-tabs
                v-loading="isQueryPending"
                v-model="activeTabId"
                :test-id="testId + '-tabs'"
                @keydown.native.esc.stop.prevent="doClose"
            >
                <el-tab-pane :name="tab.name" :key="tab.name" v-for="tab in publicTabs">
                    <span slot="label" :data-test-id="testId + '-el-tab-' + tab.label.toString().replace(/[\s,]+/g, '-').toLowerCase()">
                        {{ tab.label }}
                    </span>
                    <cly-listbox
                        :test-id="testId"
                        :noMatchFoundPlaceholder="noMatchFoundPlaceholder"
                        v-show="showList"
                        v-if="mode === 'single-list'"
                        :bordered="false"
                        :searchable="false"
                        :options="getMatching(tab.options)"
                        @change="handleValueChange"
                        :hasRemovableOptions="hasRemovableOptions"
                        @remove-option="removeOption"
                        v-model="innerValue"
                    >
                        <template v-slot:option-prefix="scope">
                            <slot name="option-prefix" v-bind="scope"></slot>
                        </template>
                        <template v-slot:option-suffix="scope">
                            <slot name="option-suffix" v-bind="scope"></slot>
                        </template>
                    </cly-listbox>
                    <cly-checklistbox
                        :noMatchFoundPlaceholder="noMatchFoundPlaceholder"
                        v-show="showList"
                        v-else-if="mode === 'multi-check'"
                        :test-id="testId + '-checklistbox'"
                        :disable-non-selected="disableNonSelected"
                        :searchable="false"
                        :bordered="false"
                        :options="getMatching(tab.options)"
                        @change="handleValueChange"
                        v-model="innerValue"
                    ></cly-checklistbox>
                    <cly-checklistbox
                        :noMatchFoundPlaceholder="noMatchFoundPlaceholder"
                        v-show="showList"
                        v-else-if="mode === 'multi-check-sortable'"
                        :test-id="testId + '-checklistbox'"
                        :disable-non-selected="disableNonSelected"
                        :sortable="true"
                        :bordered="false"
                        :searchable="false"
                        :persistColumnOrderKey="persistColumnOrderKey"
                        ref="checkListBox"
                        :options="getMatching(tab.options)"
                        @change="handleValueChange"
                        v-model="innerValue"
                    ></cly-checklistbox>
                    <div class="cly-vue-events-omitted-segments bu-ml-1" style="height:150px;" v-if="hasDisabledOptions && searchQuery == ''">
                        <div class="cly-vue-events-omitted-segments__title">
                            {{ disabledOptions.label }}
                        </div>
                        <vue-scroll :ops="{bar: {background: '#A7AEB8',size: '6px',specifyBorderRadius: '3px',keepShow: true}}">
                            <div class="cly-vue-events-omitted-segments__item" v-for="item in disabledOptions.options">
                                {{ item.label }}
                            </div>
                        </vue-scroll>
                    </div>
                </el-tab-pane>
            </el-tabs>
            <div class="cly-vue-select-x__footer" v-if="!autoCommit">
                <div class="cly-vue-select-x__commit-section">
                    <el-button @click="doDiscard" :data-test-id="testId + '-select-x-cancel-button'" type="secondary" size="small">{{ $i18n("common.cancel") }}</el-button>
                    <el-button @click="doCommit" :data-test-id="testId + '-select-x-confirm-button'" :disabled="disabled || !isItemCountValid" type="success" size="small">{{ $i18n("common.confirm") }}</el-button>
                </div>
            </div>
        </div>
    </cly-dropdown>
</template>

<script>
import { TabbedOptionsMixin, SearchableOptionsMixin } from './mixins.js';
import vuescroll from 'vuescroll';

export default {
    components: {
        'vue-scroll': vuescroll
    },
    mixins: [TabbedOptionsMixin, SearchableOptionsMixin],
    props: {
        title: { type: String, default: '' },
        placeholder: { type: String, default: 'Select' },
        noMatchFoundPlaceholder: {
            type: String,
            default: function() {
                return this.$i18n('common.search.no-match-found');
            },
            required: false
        },
        value: { type: [String, Number, Array, Boolean] },
        mode: { type: String, default: 'single-list' },
        autoCommit: { type: Boolean, default: true },
        disabled: { type: Boolean, default: false },
        width: { type: [Number, Object, String], default: 400 },
        size: { type: String, default: '' },
        adaptiveLength: { type: Boolean, default: false },
        minInputWidth: { type: Number, default: -1, required: false },
        maxInputWidth: { type: Number, default: -1, required: false },
        showSelectedCount: { type: Boolean, default: false },
        arrow: { type: Boolean, default: true },
        singleOptionSettings: {
            type: Object,
            default: function() {
                return {
                    hideList: false,
                    autoPick: false
                };
            },
            required: false
        },
        popClass: { type: String, required: false },
        minItems: { type: Number, default: 0, required: false },
        maxItems: { type: Number, default: Number.MAX_SAFE_INTEGER, required: false },
        hasRemovableOptions: { type: Boolean, default: false, required: false },
        collapseTags: { type: Boolean, default: true, required: false },
        showSearch: { type: Boolean, default: false },
        popperAppendToBody: { type: Boolean, default: true },
        persistColumnOrderKey: { type: String, default: null },
        testId: { type: String, default: "cly-select-x-test-id" }
    },
    data: function() {
        return {
            uncommittedValue: null
        };
    },
    computed: {
        isMultiple: function() {
            return (this.mode + "").startsWith("multi");
        },
        popClasses: function() {
            return {
                "cly-vue-select-x__pop--hidden-tabs": this.hideDefaultTabs || !this.showTabs,
                "cly-vue-select-x__pop--has-single-option": this.hasSingleOption,
                "cly-vue-select-x__pop--has-slim-header": !this.searchable && !this.showTabs,
                "cly-vue-select-x__pop--hidden-header": !this.isSearchShown && !this.$scopedSlots.header && !this.$scopedSlots.action && !this.title && !this.showSelectedCount
            };
        },
        currentTab: function() {
            var self = this;
            var filtered = this.publicTabs.filter(function(tab) {
                return self.activeTabId === tab.name;
            });
            if (filtered.length > 0) {
                return filtered[0];
            }
            return {};
        },
        hasSingleOption: function() {
            return (this.activeTabId !== '__root' &&
                    this.currentTab.options &&
                    this.currentTab.options.length === 1 &&
                    this.singleOptionSettings.hideList);
        },
        showList: function() {
            return !this.hasSingleOption;
        },
        innerValue: {
            get: function() {
                if (this.uncommittedValue && this.uncommittedValue !== this.value) {
                    return this.uncommittedValue;
                }
                return this.value;
            },
            set: function(newVal) {
                if (this.autoCommit && this.isItemCountValid) {
                    this.commitValue(newVal);
                }
                else {
                    this.uncommittedValue = newVal;
                }
            }
        },
        selectedCountText: function() {
            if (this.uncommittedValue) {
                return this.$i18n('export.export-columns-selected-count', this.uncommittedValue.length, (this.options ? this.options.length : 0));
            }
            else {
                return this.$i18n('export.export-columns-selected-count', (this.value ? this.value.length : 0), (this.options ? this.options.length : 0));
            }
        },
        isItemCountValid: function() {
            if (this.mode === "single-list" || this.autoCommit || this.maxItems === 0 || this.maxItems === undefined) {
                return true;
            }
            return Array.isArray(this.innerValue) && this.innerValue.length >= this.minItems && this.innerValue.length <= this.maxItems;
        },
        isSearchShown: function() {
            if (this.searchable) {
                if (this.remote && this.initialOptionsCount > 10) {
                    return true;
                }
                else if (this.showSearch) {
                    return true;
                }
                else if (this.flatOptions.length > 10) {
                    return true;
                }
            }
            return false;
        },
        disableNonSelected: function() {
            if (this.maxItems === 0 || this.maxItems === undefined) {
                return false;
            }
            return this.innerValue && this.innerValue.length === this.maxItems;
        }
    },
    mounted: function() {
        this.determineActiveTabId();
    },
    methods: {
        handleValueChange: function() {
            if (this.mode === 'single-list' && this.autoCommit) {
                this.doClose();
            }
        },
        doClose: function() {
            this.determineActiveTabId();
            this.$refs.dropdown.handleClose();
        },
        updateDropdown: function() {
            this.$refs.dropdown.updateDropdown();
        },
        handleDropdownShow: function() {
            this.$forceUpdate();
            this.focusOnSearch();
            document.querySelectorAll(".scroll-keep-show").forEach(function(item) {
                item.style.width = '0px';
            });
            setTimeout(function() {
                document.querySelectorAll(".scroll-keep-show").forEach(function(item) {
                    item.style.width = '100%';
                });
            }, 0);
        },
        focusOnSearch: function() {
            var self = this;
            this.$nextTick(function() {
                if (self.$refs.searchBox) {
                    self.$refs.searchBox.focus();
                }
            });
        },
        focusOnTrigger: function() {
            var self = this;
            if (this.$refs.trigger && this.$refs.trigger.focus()) {
                this.$nextTick(function() {
                    self.$refs.trigger.focus();
                });
            }
        },
        doCommit: function() {
            if (!this.isItemCountValid) {
                return;
            }
            if (this.uncommittedValue) {
                if (this.persistColumnOrderKey) {
                    this.$refs.checkListBox[0].saveColumnOrder();
                }
                this.commitValue(this.uncommittedValue);
                this.uncommittedValue = null;
            }
            this.doClose();
        },
        doDiscard: function() {
            this.uncommittedValue = null;
            this.doClose();
        },
        commitValue: function(val) {
            this.$emit("input", val);
            this.$emit("change", val);
        },
        removeOption: function(options) {
            this.$emit("remove-option", options);
        }
    },
    watch: {
        searchQuery: function() {
            this.updateDropdown();
        },
        activeTabId: function() {
            this.updateDropdown();
            if (this.hasSingleOption && this.singleOptionSettings.autoPick) {
                this.innerValue = this.currentTab.options[0].value;
                this.doCommit();
            }
            document.querySelectorAll(".scroll-keep-show").forEach(function(item) {
                item.style.width = '0px';
            });
            setTimeout(function() {
                document.querySelectorAll(".scroll-keep-show").forEach(function(item) {
                    item.style.width = '100%';
                });
            }, 100);
        },
        value: function(newVal) {
            if (!this.onlySelectedOptionsTab && this.isMultiple && this.remote && newVal && newVal.length === 0 && this.activeTabId === "__selected") {
                this.navigateToFirstRegularTab();
            }
            this.uncommittedValue = null;
        }
    }
};
</script>
