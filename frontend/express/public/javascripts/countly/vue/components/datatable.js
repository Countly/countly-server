/* global jQuery, Vue, _ */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var TableExtensionsMixin = {
        props: {
            persistKey: {
                type: String,
                default: null
            },
            dataSource: {
                type: Object,
                default: function() {
                    return null;
                }
            },
            rows: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            availableDynamicCols: {
                type: Array,
                default: function() {
                    return [];
                }
            }
        },
        computed: {
            hasDynamicCols: function() {
                return this.availableDynamicCols.length > 0;
            },
            availableDynamicColsLookup: function() {
                return this.availableDynamicCols.reduce(function(acc, col) {
                    acc[col.value] = col;
                    return acc;
                }, {});
            },
            publicDynamicCols: function() {
                var self = this;
                return this.controlParams.selectedDynamicCols.map(function(val) {
                    return self.availableDynamicColsLookup[val];
                });
            },
            localSearchedRows: function() {
                var currentArray = this.rows.slice();
                if (this.controlParams.searchQuery) {
                    var queryLc = this.controlParams.searchQuery.toLowerCase();
                    currentArray = currentArray.filter(function(item) {
                        return Object.keys(item).some(function(fieldKey) {
                            return item[fieldKey].toString().toLowerCase().indexOf(queryLc) > -1;
                        });
                    });
                }
                return currentArray;
            },
            localDataView: function() {
                var currentArray = this.localSearchedRows;
                if (this.controlParams.sort.length > 0) {
                    var sorting = this.controlParams.sort[0],
                        dir = sorting.type === "asc" ? 1 : -1;

                    currentArray = currentArray.slice();
                    currentArray.sort(function(a, b) {
                        if (a[sorting.field] < b[sorting.field]) {
                            return -dir;
                        }
                        if (a[sorting.field] > b[sorting.field]) {
                            return dir;
                        }
                        return 0;
                    });
                }
                var filteredTotal = currentArray.length;
                if (this.controlParams.perPage < currentArray.length) {
                    var startIndex = (this.controlParams.page - 1) * this.controlParams.perPage,
                        endIndex = startIndex + this.controlParams.perPage;
                    currentArray = currentArray.slice(startIndex, endIndex);
                }
                return {
                    rows: currentArray,
                    totalRows: filteredTotal,
                    notFilteredTotalRows: this.rows.length
                };
            },
            dataView: function() {
                if (this.dataSource) {
                    return this.externalData;
                }
                else {
                    return this.localDataView;
                }
            },
            totalPages: function() {
                return Math.ceil(this.dataView.totalRows / this.controlParams.perPage);
            },
            lastPage: function() {
                return this.totalPages;
            },
            prevAvailable: function() {
                return this.controlParams.page > this.firstPage;
            },
            nextAvailable: function() {
                return this.controlParams.page < this.lastPage;
            },
            paginationInfo: function() {
                var page = this.controlParams.page,
                    perPage = this.controlParams.perPage,
                    searchQuery = this.controlParams.searchQuery,
                    grandTotal = this.dataView.notFilteredTotalRows,
                    filteredTotal = this.dataView.totalRows,
                    startEntries = (page - 1) * perPage + 1,
                    endEntries = Math.min(startEntries + perPage - 1, filteredTotal),
                    info = this.i18n("common.table.no-data");

                if (filteredTotal > 0) {
                    info = this.i18n("common.showing")
                        .replace("_START_", startEntries)
                        .replace("_END_", endEntries)
                        .replace("_TOTAL_", filteredTotal);
                }

                if (searchQuery) {
                    info += " " + this.i18n("common.filtered").replace("_MAX_", grandTotal);
                }
                return info;
            },
            externalData: function() {
                if (!this.dataSource) {
                    return [];
                }
                var addr = this.dataSource.dataAddress;
                return addr.store.getters[addr.path];
            },
            externalStatus: function() {
                if (!this.dataSource) {
                    return undefined;
                }
                var addr = this.dataSource.statusAddress;
                return addr.store.getters[addr.path];
            },
            availablePages: function() {
                var pages = [];
                for (var i = this.firstPage, I = Math.min(this.lastPage, 10000); i <= I; i++) {
                    pages.push(i);
                }
                return pages;
            }
        },
        watch: {
            controlParams: {
                deep: true,
                handler: _.debounce(function() {
                    this.triggerExternalSource();
                    this.setControlParams();
                }, 500)
            },
            'controlParams.page': function() {
                this.checkPageBoundaries();
            },
            'controlParams.selectedDynamicCols': function() {
                this.$refs.elTable.store.updateColumns(); // TODO: Hacky, check for memory leaks.
            },
            lastPage: function() {
                this.checkPageBoundaries();
            }
        },
        data: function() {
            var controlParams = this.getControlParams();

            if (!controlParams.selectedDynamicCols || !Array.isArray(controlParams.selectedDynamicCols)) {
                controlParams.selectedDynamicCols = this.availableDynamicCols.reduce(function(acc, option) {
                    if (option.default || option.required) {
                        acc.push(option.value);
                    }
                    return acc;
                }, []);
            }

            return {
                controlParams: controlParams,
                firstPage: 1
            };
        },
        mounted: function() {
            this.triggerExternalSource();
        },
        beforeDestroy: function() {
            this.setControlParams();
        },
        methods: {
            checkPageBoundaries: function() {
                if (this.lastPage > 0 && this.controlParams.page > this.lastPage) {
                    this.controlParams.page = this.lastPage;
                }
            },
            goToFirstPage: function() {
                this.controlParams.page = this.firstPage;
            },
            goToLastPage: function() {
                this.controlParams.page = this.lastPage;
            },
            goToPrevPage: function() {
                if (this.prevAvailable) {
                    this.controlParams.page--;
                }
            },
            goToNextPage: function() {
                if (this.nextAvailable) {
                    this.controlParams.page++;
                }
            },
            onSortChange: function(elTableSorting) {
                if (elTableSorting.order) {
                    this.updateControlParams({
                        sort: [{
                            field: elTableSorting.prop,
                            type: elTableSorting.order === "ascending" ? "asc" : "desc"
                        }]
                    });
                }
                else {
                    this.updateControlParams({
                        sort: []
                    });
                }
            },
            triggerExternalSource: function() {
                if (!this.dataSource) {
                    return;
                }
                if (this.dataSource.fetch) {
                    this.dataSource.fetch(this.controlParams);
                }
                this.$emit("params-change", this.controlParams);
            },
            updateControlParams: function(newParams) {
                _.extend(this.controlParams, newParams);
            },
            getControlParams: function() {
                var defaultState = {
                    page: 1,
                    perPage: 10,
                    searchQuery: '',
                    sort: [],
                    selectedDynamicCols: false
                };
                if (!this.persistKey) {
                    return defaultState;
                }
                var loadedState = localStorage.getItem(this.persistKey);
                try {
                    if (loadedState) {
                        return JSON.parse(loadedState);
                    }
                    return defaultState;
                }
                catch (ex) {
                    return defaultState;
                }
            },
            setControlParams: function() {
                if (this.persistKey) {
                    localStorage.setItem(this.persistKey, JSON.stringify(this.controlParams));
                }
            }
        }
    };

    var MutationTrackerMixin = {
        data: function() {
            return {
                patches: {}
            };
        },
        props: {
            trackedFields: {
                type: Array,
                default: function() {
                    return [];
                }
            }
        },
        watch: {
            sourceRows: function(newSourceRows) {
                if (Object.keys(this.patches).length === 0) {
                    return [];
                }
                var self = this;

                newSourceRows.forEach(function(row) {
                    var rowKey = self.keyOf(row);
                    if (!self.patches[rowKey]) {
                        return;
                    }
                    var sourceChanges = Object.keys(self.patches[rowKey]).reduce(function(acc, fieldKey) {
                        var currentPatch = self.patches[rowKey][fieldKey];
                        if (currentPatch.originalValue !== row[fieldKey]) {
                            acc[fieldKey] = { originalValue: row[fieldKey], newValue: currentPatch.newValue };
                        }
                        else if (currentPatch.newValue !== row[fieldKey]) {
                            acc[fieldKey] = currentPatch;
                        }
                        return acc;
                    }, {});
                    Vue.set(self.patches, rowKey, sourceChanges);
                });
            }
        },
        methods: {
            keyOf: function(row, dontStringify) {
                if (dontStringify) {
                    return this.keyFn(row);
                }
                return JSON.stringify(this.keyFn(row));
            },
            patch: function(row, fields) {
                var rowKey = this.keyOf(row),
                    self = this;
                var newPatch = Object.keys(fields).reduce(function(acc, fieldKey) {
                    if (self.patches[rowKey] && Object.prototype.hasOwnProperty.call(self.patches[rowKey], fieldKey)) {
                        var originalValue = self.patches[rowKey][fieldKey].originalValue;
                        if (originalValue !== fields[fieldKey]) {
                            acc[fieldKey] = { originalValue: originalValue, newValue: fields[fieldKey] };
                        }
                    }
                    else if (row[fieldKey] !== fields[fieldKey]) {
                        acc[fieldKey] = { originalValue: row[fieldKey], newValue: fields[fieldKey] };
                    }
                    return acc;
                }, {});

                Vue.set(this.patches, rowKey, newPatch);
            },
            unpatch: function(row, fields) {
                var self = this;

                var rowKeys = null;
                if (!row) {
                    rowKeys = Object.keys(this.patches);
                }
                else {
                    rowKeys = [this.keyOf(row)];
                }

                rowKeys.forEach(function(rowKey) {
                    if (!self.patches[rowKey]) {
                        return;
                    }

                    if (!fields) {
                        Vue.delete(self.patches, rowKey);
                    }
                    else {
                        fields.forEach(function(fieldName) {
                            Vue.delete(self.patches[rowKey], fieldName);
                        });
                        if (Object.keys(self.patches[rowKey]).length === 0) {
                            Vue.delete(self.patches, rowKey);
                        }
                    }
                });

            }
        },
        computed: {
            diff: function() {
                if (this.trackedFields.length === 0 || Object.keys(this.patches).length === 0) {
                    return [];
                }
                var diff = [],
                    self = this;
                Object.keys(this.patches).forEach(function(rowKey) {
                    self.trackedFields.forEach(function(fieldName) {
                        if (self.patches[rowKey] && Object.prototype.hasOwnProperty.call(self.patches[rowKey], fieldName)) {
                            var patch = self.patches[rowKey][fieldName];
                            diff.push({
                                key: JSON.parse(rowKey),
                                field: fieldName,
                                newValue: patch.newValue,
                                originalValue: patch.originalValue
                            });
                        }
                    });
                });
                return diff;
            },
            mutatedRows: function() {
                if (Object.keys(this.patches).length === 0) {
                    return this.sourceRows;
                }
                var self = this;
                return self.sourceRows.map(function(row) {
                    var rowKey = self.keyOf(row);
                    if (self.patches[rowKey]) {
                        var newValues = Object.keys(self.patches[rowKey]).reduce(function(acc, fieldKey) {
                            acc[fieldKey] = self.patches[rowKey][fieldKey].newValue;
                            return acc;
                        }, {});
                        return Object.assign({}, row, newValues);
                    }
                    return row;
                });
            }
        }
    };

    var DEFAULT_ROW = {
        rowspan: 1,
        colspan: 1
    };

    var NO_COL_ROW = {
        rowspan: 1,
        colspan: 0
    };

    var OverlayRowMixin = {
        props: {
            isOverlayActiveFn: {
                type: Function,
                default: null
            },
        },
        methods: {
            tableSpanMethod: function(obj) {
                if (this.isOverlayActiveFn && this.isOverlayActiveFn(obj)) {
                    if (obj.column.type !== "overlay") {
                        return NO_COL_ROW;
                    }
                    else {
                        return {
                            rowspan: 1,
                            colspan: this.$refs.elTable.columns.length
                        };
                    }
                }
                return DEFAULT_ROW;
            }
        }
    };

    Vue.component("cly-datatable-n", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n,
            TableExtensionsMixin,
            MutationTrackerMixin,
            OverlayRowMixin
        ],
        props: {
            keyFn: {
                type: Function,
                default: function(row) {
                    return row._id;
                }
            },
            availablePageSizes: {
                type: Array,
                default: function() {
                    return [5, 10, 20, 50, 100, 200, 1000];
                }
            },
            searchPlaceholder: {
                type: String,
                default: 'Search'
            },
            border: {
                type: Boolean,
                default: false
            }
        },
        data: function() {
            return {
                slotMapping: {
                    'header-left': 'header-left',
                    'header-right': 'header-right',
                    'footer-left': 'footer-left',
                    'footer-right': 'footer-right',
                    'bottomline': 'bottomline'
                }
            };
        },
        computed: {
            searchQueryProxy: {
                get: function() {
                    return this.controlParams.searchQuery;
                },
                set: function(query) {
                    _.extend(this.controlParams, { searchQuery: query, page: 1});
                }
            },
            forwardedSlots: function() {
                var self = this;
                return Object.keys(this.$scopedSlots).reduce(function(slots, slotKey) {
                    if (!self.slotMapping[slotKey]) {
                        slots[slotKey] = self.$scopedSlots[slotKey];
                    }
                    return slots;
                }, {});
            },
            isLoading: function() {
                if (!this.dataSource) {
                    return false;
                }
                return this.externalStatus !== 'ready';
            },
            classes: function() {
                if (this.dataSource && this.externalStatus === 'silent-pending') {
                    return ["silent-loading"];
                }
                return [];
            },
            sourceRows: function() {
                return this.dataView.rows;
            },
            commonScope: function() {
                return {
                    diff: this.diff,
                    patch: this.patch,
                    unpatch: this.unpatch,
                    dynamicCols: this.publicDynamicCols
                };
            }
        },
        template: '<div class="cly-vue-eldatatable" :class="classes">\
                        <div v-loading="isLoading" element-loading-background="rgb(255,255,255,0.3)">\
                            <div class="bu-level cly-vue-eldatatable__header cly-vue-eldatatable__header--white">\
                                <div class="bu-level-left">\
                                    <slot v-bind="commonScope" name="header-left"></slot>\
                                </div>\
                                <div class="bu-level-right">\
                                    <slot v-bind="commonScope" name="header-right"></slot>\
                                    <div class="bu-level-item">\
                                        <cly-select-x\
                                            v-if="hasDynamicCols"\
                                            search-placeholder="Search in Columns"\
                                            placeholder="Edit columns" \
                                            title="Edit columns"\
                                            mode="multi-check-sortable"\
                                            placement="bottom-end"\
                                            :width="300"\
                                            :auto-commit="false"\
                                            :hide-default-tabs="true"\
                                            :hide-all-options-tab="true"\
                                            :options="availableDynamicCols"\
                                            v-model="controlParams.selectedDynamicCols">\
                                            <template v-slot:trigger>\
                                                <el-button size="small" icon="el-icon-s-operation"></el-button>\
                                            </template>\
                                        </cly-select-x>\
                                    </div>\
                                    <div class="bu-level-item">\
                                        <el-input size="small" class="cly-vue-eldatatable__search--grey" style="width:200px" prefix-icon="el-icon-search" :placeholder="searchPlaceholder" v-model="searchQueryProxy"></el-input>\
                                    </div>\
                                </div>\
                            </div>\
                            <el-table\
                                :border="border"\
                                :row-key="keyFn"\
                                :data="mutatedRows"\
                                :span-method="tableSpanMethod"\
                                v-bind="$attrs"\
                                v-on="$listeners"\
                                @sort-change="onSortChange"\
                                ref="elTable">\
                                    <template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">\
                                        <slot :name="name" v-bind="commonScope"/>\
                                    </template>\
                            </el-table>\
                            <div class="bu-level cly-vue-eldatatable__footer cly-vue-eldatatable__footer--white">\
                                <div class="bu-level-left">\
                                    <div class="bu-level-item">\
                                        {{ i18n("common.items-per-page") }}:\
                                    </div>\
                                    <div class="bu-level-item">\
                                        <el-select v-model="controlParams.perPage" size="mini">\
                                            <el-option v-for="pageSize in availablePageSizes" :key="pageSize" :value="pageSize" :label="pageSize"></el-option>\
                                        </el-select>\
                                    </div>\
                                    <div class="bu-level-item cly-vue-eldatatable__vertical-divider">\
                                    </div>\
                                    <div class="bu-level-item" style="font-size: 11px">\
                                        {{ paginationInfo }}\
                                    </div>\
                                    <slot v-bind="commonScope" name="footer-left"></slot>\
                                </div>\
                                <div class="bu-level-right">\
                                    <slot v-bind="commonScope" name="footer-right"></slot>\
                                    <div class="bu-level-item">\
                                        <div class="cly-vue-eldatatable__table-page-selector">\
                                            <el-select v-model="controlParams.page" size="mini">\
                                                <el-option v-for="page in availablePages" :key="page" :value="page" :label="page"></el-option>\
                                            </el-select>\
                                        </div>\
                                    </div>\
                                    <div class="bu-level-item">\
                                        of {{totalPages}} pages\
                                    </div>\
                                    <div class="bu-level-item">\
                                        <span :class="{disabled: !prevAvailable}" @click="goToFirstPage"><i class="fa fa-angle-double-left"></i></span>\
                                    </div>\
                                    <div class="bu-level-item">\
                                        <span :class="{disabled: !prevAvailable}" @click="goToPrevPage"><i class="fa fa-angle-left"></i></span>\
                                    </div>\
                                    <div class="bu-level-item">\
                                        <span :class="{disabled: !nextAvailable}" @click="goToNextPage"><i class="fa fa-angle-right"></i></span>\
                                    </div>\
                                    <div class="bu-level-item">\
                                        <span :class="{disabled: !nextAvailable}" @click="goToLastPage"><i class="fa fa-angle-double-right"></i></span>\
                                    </div>\
                                </div>\
                            </div>\
                            <div>\
                                <slot name="bottomline" v-bind="commonScope"></slot>\
                            </div>\
                        </div>\
                    </div>'
    }));


}(window.countlyVue = window.countlyVue || {}, jQuery));
