<template>
    <div
        style="height: 100%"
        class="cly-vue-listbox scroll-keep-show"
        tabindex="0"
        :class="topClasses"
        @mouseenter="handleHover"
        @mouseleave="handleBlur"
        @focus="handleHover"
        @blur="handleBlur"
    >
        <div class="cly-vue-listbox__header bu-p-3" v-if="searchable">
            <form>
                <el-input
                    :disabled="disabled"
                    test-id="cly-listbox-search-input"
                    autocomplete="off"
                    v-model="searchQuery"
                    :placeholder="searchPlaceholder"
                >
                    <i slot="prefix" class="el-input__icon el-icon-search"></i>
                </el-input>
            </form>
        </div>
        <vue-scroll
            :style="vueScrollStyle"
            v-if="searchedOptions.length > 0"
            :data-test-id="testId + '-scroll'"
            :ops="scrollCfg"
        >
            <div :style="wrapperStyle" class="cly-vue-listbox__items-wrapper">
                <div
                    tabindex="0"
                    class="text-medium font-weight-bold"
                    :class="{
                        'selected': value === option.value,
                        'hover': hovered === option.value,
                        'cly-vue-listbox__item': !option.group,
                        'cly-vue-listbox__group text-uppercase': option.group
                    }"
                    :key="'i' + idx + '.' + option.value"
                    @focus="!option.group && handleItemHover(option)"
                    @mouseenter="!option.group && handleItemHover(option)"
                    @keyup.enter="!option.group && handleItemClick(option)"
                    @click.stop="!option.group && handleItemClick(option)"
                    v-for="(option, idx) in searchedOptions"
                >
                    <div class="cly-vue-listbox__item-content" :data-test-id="testId + '-' + 'item'">
                        <div class="bu-level">
                            <div class="bu-level-left">
                                <div v-if="!!$scopedSlots['option-prefix']" class="cly-vue-listbox__item-prefix bu-mr-1">
                                    <slot name="option-prefix" v-bind="option"></slot>
                                </div>
                                <slot name="option-label" v-bind="option">
                                    <div
                                        :data-test-id="testId + '-item-' + (option.label ? option.label.replaceAll(' ', '-').toLowerCase() : ' ')"
                                        class="cly-vue-listbox__item-label"
                                        v-tooltip="decodeHtml(option.label)"
                                    >{{ decodeHtml(option.label) }}</div>
                                </slot>
                            </div>
                            <div class="bu-level-right" v-if="hasRemovableOptions || !!$scopedSlots['option-suffix']">
                                <slot class="cly-vue-listbox__item-suffix" name="option-suffix" v-bind="option"></slot>
                                <div class="cly-vue-listbox__remove-option" v-if="hasRemovableOptions" @click.stop="onRemoveOption(option)">
                                    <i class="el-icon-close"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </vue-scroll>
        <div v-else class="cly-vue-listbox__no-data color-cool-gray-50 bu-pb-4 bu-has-text-weight-normal" data-test-id="cly-listbox-no-match-found-label">
            {{ noMatchFoundPlaceholder }}
        </div>
    </div>
</template>

<script>
import { AbstractListBoxMixin, SearchableOptionsMixin } from './mixins.js';
import countlyCommon from '../../countly/countly.common.js';

export default {
    mixins: [AbstractListBoxMixin, SearchableOptionsMixin],
    props: {
        searchable: {
            type: Boolean,
            default: false,
            required: false
        },
        value: {
            type: [String, Number, Boolean]
        },
        testId: {
            type: String,
            default: 'cly-listbox-test-id',
            required: false
        }
    },
    computed: {
        searchedOptions: function() {
            return this.getMatching(this.options);
        }
    },
    methods: {
        decodeHtml: function(str) {
            return countlyCommon.unescapeHtml(str);
        }
    }
};
</script>
