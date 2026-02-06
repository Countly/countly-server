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
            :ops="scrollCfg"
        >
            <div :style="wrapperStyle" class="cly-vue-listbox__items-wrapper">
                <el-checkbox-group v-model="innerValue">
                    <draggable
                        handle=".drag-handler"
                        v-model="searchedOptions"
                        :disabled="!sortable"
                    >
                        <div
                            class="text-medium cly-vue-listbox__item"
                            :style="[option.disabled ? {'pointer-events' : 'none'} : {'pointer-events': 'all'}]"
                            :key="option.value + '-' + index"
                            v-for="(option, index) in searchedOptions"
                        >
                            <div v-if="sortable" class="drag-handler">
                                <img :src="'images/icons/drag-icon.svg'" />
                            </div>
                            <el-checkbox
                                :test-id="testId + '-' + (option.label ? option.label.replaceAll(' ', '-').toLowerCase() : 'el-checkbox')"
                                :label="option.value"
                                v-tooltip="option.label"
                                :key="option.value"
                                :disabled="(disableNonSelected && !innerValue.includes(option.value)) || option.disabled"
                            >{{ option.label }}</el-checkbox>
                        </div>
                    </draggable>
                </el-checkbox-group>
            </div>
        </vue-scroll>
        <div v-else class="cly-vue-listbox__no-data">
            {{ noMatchFoundPlaceholder }}
        </div>
    </div>
</template>

<script>
import { AbstractListBoxMixin, SearchableOptionsMixin } from './mixins.js';
import countlyGlobal from '../../countly/countly.global.js';
import $ from 'jquery';
import vuescroll from 'vuescroll';

export default {
    components: {
        'vue-scroll': vuescroll
    },
    mixins: [AbstractListBoxMixin, SearchableOptionsMixin],
    props: {
        value: {
            type: Array,
            default: function() {
                return [];
            }
        },
        sortable: {
            type: Boolean,
            default: false
        },
        disableNonSelected: {
            type: Boolean,
            default: false
        },
        persistColumnOrderKey: {
            type: String,
            default: null
        },
        testId: {
            type: String,
            default: 'cly-checklistbox-test-id'
        }
    },
    data: function() {
        var savedSortMap = null;
        if (this.persistColumnOrderKey && countlyGlobal.member.columnOrder && countlyGlobal.member.columnOrder[this.persistColumnOrderKey] && countlyGlobal.member.columnOrder[this.persistColumnOrderKey].reorderSortMap) {
            savedSortMap = countlyGlobal.member.columnOrder[this.persistColumnOrderKey].reorderSortMap;
            Object.keys(savedSortMap).forEach(function(key) {
                savedSortMap[key] = parseInt(savedSortMap[key], 10);
            });
        }
        return {
            sortMap: savedSortMap
        };
    },
    watch: {
        options: {
            immediate: true,
            handler: function(options) {
                if (this.sortable && !this.sortMap) {
                    this.sortMap = Object.freeze(options.reduce(function(acc, opt, idx) {
                        acc[opt.value] = idx;
                        return acc;
                    }, {}));
                }
            }
        }
    },
    computed: {
        innerValue: {
            get: function() {
                return this.value;
            },
            set: function(newVal) {
                if (this.disabled) {
                    return;
                }
                if (this.sortable && this.sortMap) {
                    var sortMap = this.sortMap,
                        wrapped = newVal.map(function(value, idx) {
                            return { value: value, idx: idx, ord: sortMap[value] || 0 };
                        });

                    wrapped.sort(function(a, b) {
                        return (a.ord - b.ord) || (a.idx - b.idx);
                    });

                    var sorted = wrapped.map(function(item) {
                        return item.value;
                    });
                    this.commitValue(sorted);
                }
                else {
                    this.commitValue(newVal);
                }
            }
        },
        sortedOptions: {
            get: function() {
                return this.computeSortedOptions();
            },
            set: function(sorted) {
                if (!this.sortable) {
                    return;
                }
                this.sortMap = Object.freeze(sorted.reduce(function(acc, opt, idx) {
                    acc[opt.value] = idx;
                    return acc;
                }, {}));
                this.innerValue = this.value;
                this.$emit('update:options', this.computeSortedOptions());
            }
        },
        searchedOptions: function() {
            return this.getMatching(this.sortedOptions);
        }
    },
    methods: {
        computeSortedOptions: function() {
            if (!this.sortable || !this.sortMap) {
                return this.options;
            }
            var sortMap = this.sortMap,
                wrapped = this.options.map(function(opt, idx) {
                    return { opt: opt, idx: idx, ord: sortMap[opt.value] || 0 };
                });

            wrapped.sort(function(a, b) {
                return (a.ord - b.ord) || (a.idx - b.idx);
            });

            return wrapped.map(function(item) {
                return item.opt;
            });
        },
        commitValue: function(val) {
            this.$emit("input", val);
            this.$emit("change", val);
        },
        saveColumnOrder: function() {
            if (!this.persistColumnOrderKey) {
                return;
            }
            var self = this;
            var sortMap = {};
            this.sortedOptions.forEach(function(val, idx) {
                sortMap[val.value] = idx;
            });
            $.ajax({
                type: "POST",
                url: countlyGlobal.path + "/user/settings/column-order",
                data: {
                    "reorderSortMap": sortMap,
                    "columnOrderKey": this.persistColumnOrderKey,
                    _csrf: countlyGlobal.csrf_token
                },
                success: function() {
                    if (!countlyGlobal.member.columnOrder) {
                        countlyGlobal.member.columnOrder = {};
                    }
                    if (!countlyGlobal.member.columnOrder[self.persistColumnOrderKey]) {
                        countlyGlobal.member.columnOrder[self.persistColumnOrderKey] = {};
                    }
                    countlyGlobal.member.columnOrder[self.persistColumnOrderKey].reorderSortMap = sortMap;
                }
            });
        }
    }
};
</script>
