/**
 * Input component mixins
 */

import _ from 'underscore';

/**
 * SearchableOptionsMixin - Provides search functionality for option lists
 */
export const SearchableOptionsMixin = {
    props: {
        searchable: { type: Boolean, default: true },
        searchPlaceholder: { type: String, default: 'Search' },
        remote: { type: Boolean, default: false },
        remoteMethod: { type: Function, required: false }
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
                return compareTo.toString().toLowerCase().indexOf(query) > -1;
            });
        }
    }
};

/**
 * TabbedOptionsMixin - Provides tab functionality for option lists
 */
export const TabbedOptionsMixin = {
    props: {
        options: {
            type: Array,
            default: function() {
                return [];
            }
        },
        hideDefaultTabs: { type: Boolean, default: false },
        allPlaceholder: { type: String, default: 'All' },
        hideAllOptionsTab: { type: Boolean, default: false },
        onlySelectedOptionsTab: { type: Boolean, default: false },
        prefixLabelWithTabId: { type: Boolean, default: false },
        disabledOptions: {
            type: Object,
            default: function() {
                return {
                    label: null,
                    options: {}
                };
            },
            required: false
        },
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
        hasDisabledOptions: function() {
            return Object.keys(this.disabledOptions.options).length !== 0;
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

/**
 * AbstractListBoxMixin - Base mixin for listbox components
 */
export const AbstractListBoxMixin = {
    props: {
        options: { type: Array },
        bordered: { type: Boolean, default: true },
        margin: { type: Boolean, default: true },
        skin: {
            type: String,
            default: "default",
            required: false,
            validator: function(val) {
                return val === "default" || val === "jumbo";
            }
        },
        disabled: { type: Boolean, default: false, required: false },
        height: { type: [Number, String], default: 300, required: false },
        expandOnHover: { type: Boolean, default: false, required: false },
        hasRemovableOptions: { type: Boolean, default: false, required: false },
        noMatchFoundPlaceholder: {
            type: String,
            default: function() {
                return this.$i18n('common.search.no-match-found');
            },
            required: false
        }
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
        }
    }
};
