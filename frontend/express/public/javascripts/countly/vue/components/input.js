/* global Vue, CV, countlyGlobal, $, _, countlyCommon */

(function(countlyVue) {

    var _mixins = countlyVue.mixins;
    var HEX_COLOR_REGEX = new RegExp('^#([0-9a-f]{3}|[0-9a-f]{6})$', 'i');

    Vue.component("cly-colorpicker", countlyVue.components.BaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        props: {
            value: {type: [String, Object], default: "#FFFFFF"},
            resetValue: { type: [String, Object], default: "#FFFFFF"},
            placement: {type: String, default: "left"},
            testId: {type: String, default: "cly-colorpicker-test-id"}
        },
        data: function() {
            return {
                isOpened: false
            };
        },
        computed: {
            previewStyle: function() {
                return {
                    "background-color": this.value
                };
            },
            localValue: {
                get: function() {
                    return this.value.replace("#", "");
                },
                set: function(value) {
                    var colorValue = "#" + value.replace("#", "");
                    if (colorValue.match(HEX_COLOR_REGEX)) {
                        this.setColor({hex: colorValue});
                    }
                }
            },
            alignment: function() {
                return "picker-body--" + this.placement;
            },
        },
        methods: {
            setColor: function(color) {
                this.$emit("input", color.hex);
            },
            reset: function() {
                this.setColor({hex: this.resetValue});
            },
            open: function() {
                this.isOpened = true;
            },
            close: function() {
                this.isOpened = false;
            },
            confirm: function(color) {
                this.$emit('change', color);
                this.isOpened = false;
            }
        },
        components: {
            picker: window.VueColor.Sketch
        },
        template: '<div class="cly-vue-colorpicker">\n' +
                        '<div @click.stop="open" :data-test-id="testId" class="preview">\n' +
                            '<div>\n' +
                                '<div class="drop bu-mt-auto" :data-test-id="testId + \'-cly-color-picker-img-wrapper\'" :style="previewStyle"></div>\n' +
                                '<img src="/images/icons/blob.svg"/>\n' +
                            '</div>\n' +
                            '<input class="color-input" v-model="localValue" type="text"/>\n' +
                            '<img height="12px" width="10px" class="bu-pt-2" v-if="!isOpened" src="/images/icons/arrow_drop_down_.svg"/>\n' +
                            '<img height="12px" width="10px" class="bu-pt-2" v-if="isOpened" src="/images/icons/arrow_drop_up_.svg"/>\n' +
                        '</div>\n' +
                        '<div class="picker-body" v-if="isOpened" v-click-outside="close" :class="alignment">\n' +
                            '<picker :preset-colors="[]" :value="value" @input="setColor"></picker>\n' +
                            '<div class="button-controls">\n' +
                                '<cly-button :data-test-id="testId + \'-reset-button\'" :label="i18n(\'common.reset\')" @click="reset" skin="light"></cly-button>\n' +
                                '<cly-button :data-test-id="testId + \'-cancel-button\'" :label="i18n(\'common.cancel\')" @click="close" skin="light"></cly-button>\n' +
                                '<cly-button :data-test-id="testId + \'-confirm-button\'" :label="i18n(\'common.confirm\')" @click="confirm(setColor)" skin="green"></cly-button>\n' +
                            '</div>\n' +
                        '</div>\n' +
                      '</div>'
    }));

    Vue.component("cly-dropzone", window.vue2Dropzone);

    var AbstractListBox = countlyVue.views.BaseView.extend({
        props: {
            options: {type: Array},
            bordered: {type: Boolean, default: true},
            margin: {type: Boolean, default: true},
            skin: {
                type: String,
                default: "default",
                required: false,
                validator: function(val) {
                    return val === "default" || val === "jumbo";
                }
            },
            disabled: {type: Boolean, default: false, required: false},
            height: {type: [Number, String], default: 300, required: false},
            expandOnHover: {type: Boolean, default: false, required: false},
            hasRemovableOptions: {type: Boolean, default: false, required: false},
            noMatchFoundPlaceholder: {type: String, default: CV.i18n('common.search.no-match-found'), required: false }
        },
        methods: {
            onRemoveOption: function(option) {
                this.$emit("remove-option", option);
            },
            navigateOptions: function() {
                if (!this.visible) {
                    this.visible = true;
                }
            },
            handleItemClick: function(option) {
                if (!this.disabled) {
                    this.$emit("input", option.value);
                    this.$emit("change", option.value);
                }
            },
            handleItemHover: function(option) {
                this.hovered = option.value;
            },
            handleBlur: function() {
                this.hovered = this.value;
                this.focused = false;
            },
            handleHover: function() {
                this.focused = true;
            },
        },
        data: function() {
            return {
                hovered: null,
                focused: false,
                scrollCfg: {
                    scrollPanel: {
                        initialScrollX: false,
                        scrollingX: false
                    },
                    rail: {
                        gutterOfSide: "0px",
                        keepShow: true,
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: true,
                        onlyShowBarOnScroll: true
                    }
                }
            };
        },
        computed: {
            topClasses: function() {
                var classes = {
                    "is-focus": this.focused,
                    "cly-vue-listbox--bordered": this.bordered,
                    "cly-vue-listbox--disabled": this.disabled,
                    "cly-vue-listbox--has-margin": this.margin && !(this.skin === "jumbo"),
                    "is-expanded": this.expandOnHover && this.focused,
                    "is-expandable": this.expandOnHover
                };
                classes["cly-vue-listbox--has-" + this.skin + "-skin"] = true;
                return classes;
            },
            wrapperStyle: function() {
                if (this.height !== "auto") {
                    return {
                        'max-height': this.height + "px"
                    };
                }
                return false;
            },
            vueScrollStyle: function() {
                if (this.searchable) {
                    return {
                        'height': 'calc(100% - 58px)'
                    };
                }

                return false;
            }
        }
    });

    var SearchableOptionsMixin = {
        props: {
            searchable: {type: Boolean, default: true},
            searchPlaceholder: {type: String, default: 'Search'}
        },
        data: function() {
            return {
                searchQuery: '',
                isQueryPending: false
            };
        },
        mounted: function() {
            this.callRemote();
        },
        watch: {
            searchQuery: _.debounce(function(newVal) {
                this.callRemote(newVal);
            }, 500)
        },
        methods: {
            callRemote: function(query) {
                if (this.remote && this.remoteMethod) {
                    var self = this;
                    this.isQueryPending = true;
                    Promise.resolve(this.remoteMethod(query || '')).finally(function() {
                        self.isQueryPending = false;
                        self.updateDropdown && self.updateDropdown();
                        if (!self.onlySelectedOptionsTab) {
                            self.navigateToFirstRegularTab();
                        }
                    });
                }
            },
            getMatching: function(options) {
                if (!this.searchQuery || !this.searchable || this.remote) {
                    return options;
                }
                var self = this;
                var query = (self.searchQuery + "").toLowerCase();
                return options.filter(function(option) {
                    if (!option) {
                        return false;
                    }
                    var compareTo = option.label || option.value || "";
                    // option label or value is not always a string
                    return compareTo.toString().toLowerCase().indexOf(query) > -1;
                });
            }
        }
    };

    Vue.component("cly-listbox", AbstractListBox.extend({
        mixins: [SearchableOptionsMixin],
        props: {
            searchable: {type: Boolean, default: false, required: false}, //override the mixin
            value: { type: [String, Number, Boolean] },
            testId: {
                type: String,
                default: 'cly-listbox-test-id',
                required: false
            },
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
        },
        template: '<div\
                    style="height: 100%"\
                    class="cly-vue-listbox scroll-keep-show"\
                    tabindex="0"\
                    :class="topClasses"\
                    @mouseenter="handleHover"\
                    @mouseleave="handleBlur"\
                    @focus="handleHover"\
                    @blur="handleBlur">\
                    <div class="cly-vue-listbox__header bu-p-3" v-if="searchable">\
                        <form>\
                            <el-input\
                                :disabled="disabled"\
                                autocomplete="off"\
                                v-model="searchQuery"\
                                :placeholder="searchPlaceholder">\
                                <i slot="prefix" class="el-input__icon el-icon-search"></i>\
                            </el-input>\
                        </form>\
                    </div>\
                    <vue-scroll\
                        :style="vueScrollStyle"\
                        v-if="searchedOptions.length > 0"\
                        :data-test-id="testId + \'-scroll\'"\
                        :ops="scrollCfg"\>\
                        <div :style="wrapperStyle" class="cly-vue-listbox__items-wrapper">\
                            <div\
                                tabindex="0"\
                                class="text-medium font-weight-bold"\
                                :class="{\'selected\': value === option.value, \'hover\': hovered === option.value, \'cly-vue-listbox__item\': !option.group, \'cly-vue-listbox__group text-uppercase\': option.group}"\
                                :key="\'i\' + idx + \'.\' + option.value"\
                                @focus="!option.group && handleItemHover(option)"\
                                @mouseenter="!option.group && handleItemHover(option)"\
                                @keyup.enter="!option.group && handleItemClick(option)"\
                                @click.stop="!option.group && handleItemClick(option)"\
                                v-for="(option, idx) in searchedOptions">\
                                <div class="cly-vue-listbox__item-content">\
                                    <div class="bu-level">\
                                        <div class="bu-level-left">\
                                            <div v-if="!!$scopedSlots[\'option-prefix\']" class="cly-vue-listbox__item-prefix bu-mr-1">\
                                                <slot name="option-prefix" v-bind="option"></slot>\
                                            </div>\
                                            <slot name="option-label" v-bind="option">\
                                              <div :data-test-id="testId + \'-item-\' + (option.label ? option.label.replace(\' \', \'-\').toLowerCase() : \' \')" class="cly-vue-listbox__item-label" v-tooltip="option.label">{{decodeHtml(option.label)}}</div>\
                                            </slot>\
                                        </div>\
                                        <div class="bu-level-right" v-if="hasRemovableOptions || !!$scopedSlots[\'option-suffix\']">\
                                            <slot class="cly-vue-listbox__item-suffix" name="option-suffix" v-bind="option"></slot>\
                                            <div class="cly-vue-listbox__remove-option" v-if="hasRemovableOptions" @click.stop="onRemoveOption(option)"><i class="el-icon-close"></i></div>\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>\
                        </div>\
                    </vue-scroll>\
                    <div v-else class="cly-vue-listbox__no-data">\
                        {{noMatchFoundPlaceholder}}\
                    </div>\
                </div>'
    }));

    Vue.component("cly-checklistbox", AbstractListBox.extend({
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
                default: 'cly-checklistbox-test-id',
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
            saveColumnOrder() {
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
                        //since countlyGlobal.member does not updates automatically till refresh
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
                    this.innerValue = this.value; // triggers innerValue.set
                    this.$emit('update:options', this.computeSortedOptions());
                }
            }
        },
        template: '<div\
                    style="height: 100%"\
                    class="cly-vue-listbox scroll-keep-show"\
                    tabindex="0"\
                    :class="topClasses"\
                    @mouseenter="handleHover"\
                    @mouseleave="handleBlur"\
                    @focus="handleHover"\
                    @blur="handleBlur">\
                    <vue-scroll\
                        :style="vueScrollStyle"\
                        v-if="options.length > 0"\
                        :ops="scrollCfg"\>\
                        <div :style="wrapperStyle" class="cly-vue-listbox__items-wrapper">\
                            <el-checkbox-group\
                                v-model="innerValue">\
                                <draggable \
                                    handle=".drag-handler"\
                                    v-model="sortedOptions"\
                                    :disabled="!sortable">\
                                <div\
                                    class="text-medium cly-vue-listbox__item"\
                                    :style="[option.disabled ? {\'pointer-events\' : \'none\'} : {\'pointer-events\': \'all\'}]"\
                                    :key="option.value"\
                                    v-for="option in sortedOptions">\
                                    <div v-if="sortable" class="drag-handler"><img src="images/icons/drag-icon.svg" /></div>\
                                    <el-checkbox :test-id="testId + \'-\' + (option.label ? option.label.replace(\' \', \'-\').toLowerCase() : \'el-checkbox\')" :label="option.value" v-tooltip="option.label" :key="option.value" :disabled="(disableNonSelected && !innerValue.includes(option.value)) || option.disabled">{{option.label}}</el-checkbox>\
                                </div>\
                                </draggable>\
                            </el-checkbox-group>\
                        </div>\
                    </vue-scroll>\
                    <div v-else class="cly-vue-listbox__no-data">\
                        {{noMatchFoundPlaceholder}}\
                    </div>\
                </div>'
    }));

    var TabbedOptionsMixin = {
        props: {
            options: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            hideDefaultTabs: {type: Boolean, default: false},
            allPlaceholder: {type: String, default: 'All'},
            hideAllOptionsTab: {type: Boolean, default: false},
            onlySelectedOptionsTab: {type: Boolean, default: false},
            prefixLabelWithTabId: {type: Boolean, default: false}
        },
        data: function() {
            return {
                activeTabId: null,
                initialOptionsCount: 0
            };
        },
        computed: {
            missingOptions: function() {
                var query = this.value;

                if (!query) {
                    return [];
                }

                if (!Array.isArray(query)) {
                    query = [query];
                }
                var self = this;
                return query.filter(function(key) {
                    return !self.flatOptions.some(function(option) {
                        return key === option.value;
                    });
                }).map(function(missingKey) {
                    return {
                        label: missingKey,
                        value: missingKey
                    };
                });
            },
            missingOptionsTab: function() {
                if (this.missingOptions.length) {
                    return {
                        name: "__missing",
                        label: "?",
                        options: this.missingOptions
                    };
                }
                return null;
            },
            selectedOptions: function() {
                if (!this.onlySelectedOptionsTab && !this.flatOptions.length && !this.missingOptions.length) {
                    return [];
                }
                var self = this,
                    missingOptions = this.missingOptions || [];

                if (this.onlySelectedOptionsTab) {
                    var selected = null;
                    if (Array.isArray(this.value)) {
                        selected = this.value.slice();
                    }
                    else {
                        selected = [this.value];
                    }
                    return this.flatOptions.reduce(function(acc, item) {
                        var idx = acc.indexOf(item.value);
                        if (idx > -1) {
                            acc.splice(idx, 1);
                        }
                        return acc;
                    }, selected).map(function(missingKey) {
                        return {
                            label: missingKey,
                            value: missingKey
                        };
                    }).concat(this.flatOptions);
                }

                if (Array.isArray(this.value)) {
                    return missingOptions.concat(this.flatOptions.filter(function(item) {
                        return self.value.indexOf(item.value) > -1;
                    }));
                }
                else {
                    var matching = this.flatOptions.filter(function(item) {
                        return item.value === self.value;
                    });
                    if (this.prefixLabelWithTabId && matching.length) {
                        var selectedTab = this.publicTabs.filter(function(tab) {
                            return self.val2tab[self.value] === tab.name;
                        });
                        if (selectedTab.length) {
                            var valueTab = selectedTab[0];
                            var singleOption = valueTab.options && valueTab.options.length === 1 && this.singleOptionSettings.hideList;
                            if (!singleOption) {
                                matching = [{
                                    label: selectedTab[0].label + ", " + matching[0].label,
                                    value: matching[0].value
                                }];
                            }
                        }
                    }
                    return missingOptions.concat(matching);
                }
            },
            selectedOptionsTab: function() {
                if (this.hasSelectedOptionsTab && this.selectedOptions && this.selectedOptions.length) {
                    return {
                        name: "__selected",
                        label: "Selected",
                        options: this.selectedOptions
                    };
                }
                return null;
            },
            hasAllOptionsTab: function() {
                if (this.hideAllOptionsTab || this.mode === "multi-check-sortable") {
                    return false;
                }
                return true;
            },
            hasSelectedOptionsTab: function() {
                return this.onlySelectedOptionsTab || (this.isMultiple && this.remote && this.value && this.value.length > 0);
            },
            showTabs: function() {
                if (this.onlySelectedOptionsTab) {
                    return false;
                }
                if (this.hasSelectedOptionsTab) {
                    return true;
                }
                if (!this.options || !this.options.length) {
                    return false;
                }
                return !!this.options[0].options;
            },
            publicTabs: function() {
                var missingOptionsTab = this.missingOptionsTab,
                    selectedOptionsTab = this.selectedOptionsTab,
                    prefixTabs = [],
                    postfixTabs = [];

                if (selectedOptionsTab) {
                    postfixTabs.push(selectedOptionsTab);
                }
                else if (missingOptionsTab) {
                    prefixTabs.push(missingOptionsTab);
                }

                if (this.showTabs && this.hasAllOptionsTab) {
                    prefixTabs.unshift({
                        name: "__all",
                        label: this.allPlaceholder,
                        options: this.flatOptions
                    });
                }

                if (!this.showTabs && !this.onlySelectedOptionsTab) {
                    prefixTabs.unshift({
                        name: "__root",
                        label: "__root",
                        options: this.options
                    });
                }

                if (!this.showTabs) {
                    return prefixTabs.concat(postfixTabs);
                }
                return prefixTabs.concat(this.options).concat(postfixTabs);
            },
            flatOptions: function() {
                if ((!this.showTabs && !this.onlySelectedOptionsTab) || !this.options.length) {
                    return this.options;
                }
                return this.options.reduce(function(items, tab) {
                    return items.concat(tab.options);
                }, []);
            },
            val2tab: function() {
                if (!this.publicTabs.length) {
                    return {};
                }
                return this.publicTabs.reduce(function(items, tab) {
                    tab.options.forEach(function(opt) {
                        items[opt.value] = tab.name;
                    });
                    return items;
                }, {});
            }
        },
        methods: {
            updateTabFn: function(tabId) {
                this.activeTabId = tabId;
            },
            determineActiveTabId: function() {
                var self = this;
                this.$nextTick(function() {
                    if (self.onlySelectedOptionsTab) {
                        self.activeTabId = "__selected";
                    }
                    else if (!self.showTabs) {
                        self.activeTabId = "__root";
                    }
                    else if (self.value && self.val2tab[self.value]) {
                        if (self.val2tab[self.value] !== "__selected") {
                            self.activeTabId = self.val2tab[self.value];
                        }
                    }
                    else if (this.hasAllOptionsTab) {
                        self.activeTabId = "__all";
                    }
                    else if (!self.activeTabId || self.activeTabId === "0" || self.activeTabId === "__all" || self.activeTabId === "__root") {
                        self.activeTabId = self.publicTabs[0].name;
                    }
                });
            },
            navigateToFirstRegularTab: function() {
                if (this.options && this.options[0]) {
                    this.activeTabId = this.options[0].name;
                }
            }
        },
        watch: {
            value: function() {
                this.determineActiveTabId();
            },
            hasAllOptionsTab: function() {
                this.determineActiveTabId();
            },
            showTabs: function() {
                this.determineActiveTabId();
            },
            'flatOptions.length': function(newVal) {
                if (this.initialOptionsCount === 0) {
                    this.initialOptionsCount = newVal;
                }

                if (!newVal && this.hasSelectedOptionsTab) {
                    this.activeTabId = "__selected";
                }
            }
        }
    };

    Vue.component("cly-select-x", countlyVue.components.create({
        mixins: [TabbedOptionsMixin, SearchableOptionsMixin, _mixins.i18n],
        template: CV.T('/javascripts/countly/vue/templates/selectx.html'),
        props: {
            title: {type: String, default: ''},
            placeholder: {type: String, default: 'Select'},
            noMatchFoundPlaceholder: {default: CV.i18n('common.search.no-match-found'), required: false },
            value: { type: [String, Number, Array, Boolean] },
            mode: {type: String, default: 'single-list'}, // multi-check,
            autoCommit: {type: Boolean, default: true},
            disabled: { type: Boolean, default: false},
            width: { type: [Number, Object, String], default: 400},
            size: {type: String, default: ''},
            adaptiveLength: {type: Boolean, default: false},
            minInputWidth: {
                type: Number,
                default: -1,
                required: false
            },
            maxInputWidth: {
                type: Number,
                default: -1,
                required: false
            },
            showSelectedCount: {type: Boolean, default: false},
            arrow: {type: Boolean, default: true},
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
            popClass: {
                type: String,
                required: false
            },
            minItems: {
                type: Number,
                default: 0,
                required: false
            },
            maxItems: {
                type: Number,
                default: Number.MAX_SAFE_INTEGER,
                required: false
            },
            hasRemovableOptions: {
                type: Boolean,
                default: false,
                required: false
            },
            //
            collapseTags: {
                type: Boolean,
                default: true,
                required: false
            },
            //
            remote: {type: Boolean, default: false},
            remoteMethod: {type: Function, required: false},
            showSearch: {type: Boolean, default: false},
            popperAppendToBody: {type: Boolean, default: true},
            persistColumnOrderKey: { type: String, default: null},
            testId: { type: String, default: "cly-select-x-test-id"},
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
                    return CV.i18n('export.export-columns-selected-count', this.uncommittedValue.length, (this.options ? this.options.length : 0));
                }
                else {
                    return CV.i18n('export.export-columns-selected-count', (this.value ? this.value.length : 0), (this.options ? this.options.length : 0));
                }
            },
            isItemCountValid: function() {
                if (this.mode === "single-list" || this.autoCommit) {
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
                        //refs returns array as we are using v-for
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
    }));

    Vue.component("cly-check", countlyVue.components.BaseComponent.extend(
        // @vue/component
        {
            props: {
                value: {default: false, type: Boolean},
                label: {type: String, default: ''},
                skin: { default: "switch", type: String},
                disabled: {type: Boolean, default: false}
            },
            computed: {
                topClasses: function() {
                    var classes = [];
                    if (["switch", "tick", "star"].indexOf(this.skin) > -1) {
                        classes.push("check-" + this.skin + "-skin");
                    }
                    else {
                        classes.push("check-switch-skin");
                    }
                    if (this.disabled) {
                        classes.push("disabled");
                    }
                    return classes;
                },
                labelClass: function() {
                    return this.getClass(this.value);
                }
            },
            methods: {
                setValue: function(e) {
                    if (!this.disabled) {
                        this.$emit('input', e);
                    }
                },
                getClass: function(value) {
                    var classes = ["check-label"];
                    if (this.skin === "tick") {
                        classes.push("fa");
                        if (value) {
                            classes.push("fa-check-square");
                        }
                        else {
                            classes.push("fa-square-o");
                        }
                    }
                    else if (this.skin === "star") {
                        classes.push("fa fa-star");
                        if (value) {
                            classes.push("color-yellow-100");
                        }
                        else {
                            classes.push("color-cool-gray-50");
                        }
                    }
                    return classes;
                }
            },
            template: '<div class="cly-vue-check" v-bind:class="topClasses">\n' +
                            '<div class="check-wrapper text-clickable">\n' +
                                '<input type="checkbox" class="check-checkbox" :checked="value">\n' +
                                '<i v-bind:class="labelClass" @click.stop="setValue(!value)"></i>\n' +
                                '<span v-if="label" class="check-text" @click.stop="setValue(!value)">{{label}}</span>\n' +
                            '</div>\n' +
                        '</div>'
        }
    ));

    Vue.component('cly-radio-block', countlyVue.components.BaseComponent.extend({
        props: {
            value: {required: true, default: -1, type: [ String, Number ]},
            items: {
                required: true,
                type: Array,
                default: function() {
                    return [];
                }
            },
            skin: { default: "main", type: String},
            disabled: {type: Boolean, default: false},
            radioDirection: { default: "vertical", type: String}
        },
        computed: {
            topClasses: function() {
                var classes = [];
                if (["main", "light"].indexOf(this.skin) > -1) {
                    classes.push("radio-" + this.skin + "-skin");
                }
                else {
                    classes.push("radio-main-skin");
                }
                if (this.disabled) {
                    classes.push("disabled");
                }
                return classes;
            },
            wrapperClasses: function() {
                var classes = "radio-wrapper";
                if (this.radioDirection === "horizontal") {
                    classes = "radio-wrapper radio-wrapper-horizontal bu-columns bu-m-0";
                }
                else {
                    classes = "radio-wrapper bu-is-flex bu-is-flex-direction-column";
                }
                return classes;
            },
            buttonClasses: function() {

                var classes = "";
                if (this.radioDirection === "horizontal") {
                    classes = " bu-column bu-p-0";
                }
                return classes;
            },
            buttonStyles: function() {

                var classes = "";
                var itemCn = this.items.length;
                if (this.radioDirection === "horizontal") {
                    classes = "width: " + 100 / itemCn + "%;";
                }

                classes += "height: 100%;";

                return classes;
            }
        },
        methods: {
            setValue: function(e) {
                if (!this.disabled) {
                    this.$emit('input', e);
                }
            }
        },
        template: '<div class="cly-vue-radio-block" v-bind:class="topClasses" style="height: 100%; overflow: auto; border-right: 1px solid #ececec">\n' +
                             '<div :class="wrapperClasses" style="height: 100%">\n' +
                                '<div @click="setValue(item.value)" v-for="(item, i) in items" :key="i"  :class="buttonClasses" :style="buttonStyles" >\n' +
                                    '<div :class="{\'selected\': value == item.value}" class="radio-button bu-is-flex bu-is-justify-content-center bu-is-align-items-center" style="height: 100%;" :data-test-id="`cly-radio-button-box-${item.label.replace(\' \', \'-\').toLowerCase()}`">\
                                        <div class="bu-is-flex" :data-test-id="`cly-radio-box-container-${item.label.replace(\' \', \'-\').toLowerCase()}`">\
                                            <div class="box" :data-test-id="`cly-radio-box-${item.label.replace(\' \', \'-\').toLowerCase()}`"></div>\
                                            <div class="bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between">\
                                                <div>\
                                                    <span class="text-medium" :data-test-id="`cly-radio-label-${item.label.replace(\' \', \'-\').toLowerCase()}`">{{item.label}}</span>\
                                                    <span v-if="item.description" :data-test-id="`cly-radio-description-${item.label.replace(\' \', \'-\').toLowerCase()}`" class="cly-vue-tooltip-icon ion ion-help-circled bu-pl-2"  v-tooltip.top-center="item.description"></span>\
                                                </div>\
                                                <div class="bu-is-flex bu-is-align-items-center number">\
                                                    <h2 v-if="item.isEstimate" class="is-estimate" v-tooltip="item.estimateTooltip" :data-test-id="`cly-radio-number-${item.label.replace(\' \', \'-\').toLowerCase()}`">~{{item.number}}</h2>\
                                                    <h2 v-else>{{item.number}}</h2>\
                                                    <div v-if="item.trend == \'u\'" class="cly-trend-up bu-ml-2" :data-test-id="`cly-radio-trend-${item.label.replace(\' \', \'-\').toLowerCase()}`">\
                                                        <i class="cly-trend-up-icon ion-android-arrow-up" :data-test-id="`cly-radio-trend-up-icon-${item.label.replace(\' \', \'-\').toLowerCase()}`"></i><span>{{item.trendValue}}</span>\
                                                    </div>\
                                                    <div v-if="item.trend == \'d\'" class="cly-trend-down bu-ml-2" :data-test-id="`cly-radio-trend-down-${item.label.replace(\' \', \'-\').toLowerCase()}`">\
                                                        <i class="cly-trend-down-icon ion-android-arrow-down" :data-test-id="`cly-radio-trend-down-icon-${item.label.replace(\' \', \'-\').toLowerCase()}`"></i><span :data-test-id="`cly-radio-trend-value-${item.label.replace(\' \', \'-\').toLowerCase()}`">{{item.trendValue}}</span>\
                                                    </div>\
                                                </div>\
                                            </div>\
                                        </div>\n' +
                                    '</div>\n' +
                                '</div>\n' +
                            '</div>\n' +
                        '</div>'
    }));
    Vue.component('cly-dynamic-textarea', countlyVue.components.BaseComponent.extend({
        template: '<div contenteditable="true" @input="update" v-html="content"></div>',
        props: ['content'],
        methods: {
            update: function(event) {
                this.$emit('update', event.target.innerText);
            }
        }
    }));

    var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)',
        SIMPLE_EMAIL = new RegExp('^' + REGEX_EMAIL + '$', 'i'),
        NAMED_EMAIL = new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i');

    Vue.component('cly-select-email', countlyVue.components.BaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        template: '<cly-select-x\
                        v-on="$listeners"\
                        v-bind="$attrs"\
                        :options="options"\
                        :placeholder="placeholder"\
                        :value="value"\
                        :searchable="false"\
                        hideAllOptionsTab\
                        mode="multi-check"\
                        ref="selectx"\
                        :noMatchFoundPlaceholder="i18n(\'common.no-email-addresses\')"\
                        class="cly-vue-select-email"\
                        @input="handleInput">\
                        <template v-slot:header="selectScope">\
                            <el-input\
                                v-model="currentInput"\
                                :class="{\'is-error\': hasError}"\
                                :placeholder="i18n(\'common.email-example\')"\
                                oninput="this.value = this.value.toLowerCase();"\
                                @keyup.enter.native="tryPush">\
                            </el-input>\
                            <div class="bu-mt-2 color-red-100 text-small" v-show="hasError">\
                                {{i18n("common.invalid-email-address", currentInput)}}\
                            </div>\
                        </template>\
                    </cly-select-x>',
        props: {
            value: {
                type: Array
            },
            placeholder: {
                type: String,
                default: CV.i18n('common.enter-email-addresses'),
                required: false
            }
        },
        data: function() {
            return {
                currentInput: '',
            };
        },
        computed: {
            options: function() {
                return this.value.map(function(val) {
                    return {value: val, label: val};
                });
            },
            parsedValue: function() {
                var input = this.currentInput;
                if (!input) {
                    return false;
                }
                else if (SIMPLE_EMAIL.test(input)) {
                    return {value: input, label: input};
                }
                else {
                    var match = input.match(NAMED_EMAIL);
                    if (match) {
                        // Current implementation ignores name field
                        return {value: match[2], label: match[2]};
                    }
                }
            },
            hasError: function() {
                return !this.parsedValue && this.currentInput;
            }
        },
        methods: {
            handleInput: function(value) {
                this.$emit("input", value);
            },
            pushAddress: function(address) {
                if (!this.value.includes(address.value)) {
                    this.handleInput(this.value.concat([address.value]));
                }
            },
            tryPush: function() {
                if (this.parsedValue) {
                    this.pushAddress(this.parsedValue);
                    this.currentInput = "";
                }
            },
            updateDropdown: function() {
                this.$refs && this.$refs.selectx && this.$refs.selectx.updateDropdown();
            }
        },
        watch: {
            value: function() {
                this.updateDropdown();
            },
            hasError: function() {
                this.updateDropdown();
            }
        }
    }));

    Vue.component("cly-sortable-items", countlyVue.components.BaseComponent.extend({
        props: {
            value: {
                type: Array
            },
            skin: {
                type: String,
                default: 'jumbo-lines'
            }
        },
        computed: {
            rootClasses: function() {
                return ["cly-vue-draggable--" + this.skin];
            }
        },
        methods: {
            handleInput: function(value) {
                this.$emit("input", value);
            },
            removeAt: function(idx) {
                var copy = this.value.slice();
                copy.splice(idx, 1);
                this.handleInput(copy);
            }
        },
        template: '<div class="cly-vue-draggable" :class="rootClasses">\
                        <draggable\
                            handle=".drag-icon"\
                            :value="value"\
                            @input="handleInput">\
                            <div class="cly-vue-draggable-item bu-p-3 bu-mb-1" :key="idx" v-for="(item, idx) in value">\
                                <img class="drag-icon" src="images/drill/drag-icon.svg">\
                                <slot :item="item" :idx="idx"></slot>\
                                <a @click="removeAt(idx)" class="ion-backspace"></a>\
                            </div>\
                        </draggable>\
                    </div>'
    }));

}(window.countlyVue = window.countlyVue || {}));