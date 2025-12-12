/* global jQuery, Vue, _, CV, countlyCommon, countlyGlobal, CountlyHelpers, countlyTaskManager, _merge, Sortable */

(function(countlyVue, $) {
    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var TableExtensionsMixin = {
        // NOTE: since this is a mixin and props are component specific, we should not define props here
        // mixins should be a complement to the component, not a dependency
        props: {
            availableDynamicCols: {
                default: () => [],
                type: Array
            },

            dataSource: {
                default: () => null,
                type: Object
            },

            defaultSort: {
                default: () => ({ prop: '_id', order: 'asc' }),
                type: Object
            },

            displaySearch: {
                default: true,
                type: Boolean
            },

            paused: {
                default: false,
                type: Boolean
            },

            persistKey: {
                default: null,
                type: String
            },

            preventDefaultSort: {
                default: false,
                type: Boolean
            },

            rows: {
                default: () => [],
                type: Array
            },

            perPage: {
                default: 10,
                type: Number
            }
        },

        emits: [
            'params-change',
            'search-query-changed'
        ],

        data() {
            const controlParams = this.getControlParams();

            if (!Array.isArray(controlParams?.selectedDynamicCols)) {
                controlParams.selectedDynamicCols = this.availableDynamicCols.reduce((acc, option) => {
                    if (option.default || option.required) {
                        acc.push(option.value);
                    }

                    return acc;
                }, []);
            }

            return {
                controlParams: controlParams,
                lastSearchQuery: '',
                firstPage: 1,
                lastControlParamsSnapshot: null
            };
        },

        computed: {
            availableDynamicColsLookup() {
                return this.availableDynamicCols.reduce((acc, col) => {
                    acc[col.value] = col;

                    return acc;
                }, {});
            },

            availablePages() {
                const pages = [];

                // NOTE: We should use a better variable name than I, it is not clear what this variable refers to
                for (let i = this.firstPage, I = Math.min(this.lastPage, 10000); i <= I; i++) {
                    pages.push(i);
                }

                return pages;
            },

            dataView() {
                return this.dataSource ? this.externalData : this.localDataView;
            },

            externalData() {
                if (!this.dataSource) {
                    return [];
                }

                const { dataAddress } = this.dataSource;

                return dataAddress.store.getters[dataAddress.path];
            },

            externalParams() {
                if (!this.dataSource) {
                    return undefined;
                }

                const { paramsAddress } = this.dataSource;

                return paramsAddress.store.getters[paramsAddress.path];
            },

            externalStatus() {
                if (!this.dataSource) {
                    return undefined;
                }

                const { statusAddress } = this.dataSource;

                return statusAddress.store.getters[statusAddress.path];
            },

            hasDynamicCols() {
                return this.availableDynamicCols.length > 0;
            },

            lastPage() {
                return this.totalPages;
            },

            localDataView() {
                let currentArray = this.localSearchedRows;
                const totalRows = currentArray.length;

                if (this.controlParams.sort.length > 0) {
                    const sorting = this.controlParams.sort[0];
                    const sortingType = sorting.type === "asc" ? 1 : -1;

                    currentArray.sort((a, b) => {
                        let priA = a[sorting.field];
                        let priB = b[sorting.field];

                        if (typeof priA === 'object' && priA !== null && priA.sortBy) {
                            priA = priA.sortBy;
                            priB = priB.sortBy;
                        }

                        if (priA < priB) {
                            return -sortingType;
                        }

                        if (priA > priB) {
                            return sortingType;
                        }

                        return 0;
                    });
                }

                // NOTE: displayMode seams to be a prop from cly-datatable component, since this is a mixin, it should
                // not reference variables from the component using it, beside being confusing,
                // it can lead to hard to debug issues
                if (this.displayMode === 'list') {
                    this.controlParams.perPage = totalRows;
                }

                if (this.controlParams.perPage < totalRows) {
                    const startIndex = (this.controlParams.page - 1) * this.controlParams.perPage;
                    const endIndex = startIndex + this.controlParams.perPage;

                    currentArray = currentArray.slice(startIndex, endIndex);
                }

                return {
                    notFilteredTotalRows: this.rows.length,
                    rows: currentArray,
                    totalRows
                };
            },

            localSearchedRows() {
                let currentArray = this.rows;

                if (this.displaySearch && this.controlParams.searchQuery) {
                    const lowerCaseSearchQuery = (`${this.controlParams.searchQuery}`).toLowerCase();

                    currentArray = currentArray.filter(item => {
                        return Object.keys(item).some(fieldKey => {
                            if (!item[fieldKey]) {
                                return false;
                            }

                            return (`${item[fieldKey]}`).toLowerCase().indexOf(lowerCaseSearchQuery) > -1;
                        });
                    });
                }

                return currentArray;
            },

            nextAvailable() {
                if (this.isCursorPagination) {
                    // Can go next if there's a next cursor or if we're not on the last page
                    return this.dataView.hasNextPage && this.dataView.nextCursor;
                }
                return this.controlParams.page < this.lastPage;
            },
            lastPageAvailable: function() {
                // Last page button is only available for traditional pagination (MongoDB)
                // and when we can actually navigate to the last page
                return !this.isCursorPagination && this.lastPage > 1 && this.controlParams.page < this.lastPage;
            },
            pageSelectionAvailable: function() {
                // Page selection dropdown is only available for traditional pagination (MongoDB)
                return !this.isCursorPagination && this.lastPage > 1;
            },
            isCursorPagination: function() {
                // Check if we're using cursor pagination based on the control params
                // For MongoDB/traditional pagination, this should be false
                // For ClickHouse, this should be true
                const result = this.controlParams && this.controlParams.useCursorPagination === true;
                return result;
            },
            paginationInfo() {
                var page = this.controlParams.page,
                    perPage = this.controlParams.perPage,
                    searchQuery = this.controlParams.searchQuery,
                    grandTotal = this.dataView.notFilteredTotalRows,
                    filteredTotal = this.dataView.totalRows,
                    currentRows = this.dataView.rows.length,
                    info = this.i18n("common.table.no-data");

                if (this.isCursorPagination) {
                    // For cursor pagination, show current page entries without total count calculation
                    if (currentRows > 0) {
                        var cursorStartEntries = (page - 1) * perPage + 1,
                            cursorEndEntries = cursorStartEntries + currentRows - 1;

                        if (filteredTotal > 0 && !this.dataView.isApproximate) {
                            // Show total if available and exact
                            info = this.i18n("common.showing")
                                .replace("_START_", countlyCommon.formatNumber(cursorStartEntries))
                                .replace("_END_", countlyCommon.formatNumber(cursorEndEntries))
                                .replace("_TOTAL_", countlyCommon.formatNumber(filteredTotal));
                        }
                        else {
                            // Show current range without total for cursor pagination
                            info = "Showing " + countlyCommon.formatNumber(cursorStartEntries) + " to " + countlyCommon.formatNumber(cursorEndEntries) + " entries";
                            if (this.dataView.isApproximate && filteredTotal > 0) {
                                info += " (≈" + countlyCommon.formatNumber(filteredTotal) + " total)";
                            }
                        }
                    }
                }
                else {
                    // Traditional pagination info
                    var traditionalStartEntries = (page - 1) * perPage + 1,
                        traditionalEndEntries = Math.min(traditionalStartEntries + perPage - 1, filteredTotal);

                    if (filteredTotal > 0) {
                        info = this.i18n("common.showing")
                            .replace("_START_", countlyCommon.formatNumber(traditionalStartEntries))
                            .replace("_END_", countlyCommon.formatNumber(traditionalEndEntries))
                            .replace("_TOTAL_", countlyCommon.formatNumber(filteredTotal));
                    }
                }

                if (this.displaySearch && searchQuery) {
                    info += `${this.i18n('common.filtered').replace('_MAX_', grandTotal)}`;
                }

                return info;
            },

            prevAvailable() {
                if (this.isCursorPagination) {
                    // Can go back if we have cursor history or if not on first page
                    const hasHistory = this.controlParams.cursorHistory.length > 0;
                    const notFirstPage = this.controlParams.page > this.firstPage;
                    const canGoBackToPage1 = this.canGoBackToPage1();
                    const result = hasHistory || notFirstPage || canGoBackToPage1;
                    return result;
                }
                return this.controlParams.page > this.firstPage;
            },

            publicDynamicCols() {
                return this.controlParams.selectedDynamicCols.map(val => this.availableDynamicColsLookup[val])
                    .filter(Boolean);
            },

            totalPages() {
                return Math.ceil(this.dataView.totalRows / this.controlParams.perPage);
            }
        },

        watch: {
            dataView: {
                handler: function(newDataView) {
                    // Update useCursorPagination based on the data view
                    if (newDataView) {
                        const hasCursorData = newDataView.hasNextPage !== undefined || newDataView.nextCursor !== undefined;
                        const shouldUseCursor = hasCursorData && (newDataView.hasNextPage || newDataView.nextCursor);

                        if (shouldUseCursor && !this.controlParams.useCursorPagination) {
                            this.controlParams.useCursorPagination = true;
                        }
                        else if (!shouldUseCursor && this.controlParams.useCursorPagination) {
                            this.controlParams.useCursorPagination = false;
                        }
                    }
                },
                deep: true
            },
            controlParams: {
                deep: true,

                handler: _.debounce(function(newVal) {
                    // Skip if this is the first run (no snapshot yet)
                    if (!this.lastControlParamsSnapshot) {
                        this.lastControlParamsSnapshot = this.getControlParamsSnapshot();
                        return;
                    }

                    // Check if only internal/derived fields changed (like useCursorPagination)
                    // These shouldn't trigger a fetch
                    const meaningfulFields = ['page', 'perPage', 'searchQuery', 'sort', 'cursor', 'selectedDynamicCols'];
                    const hasMeaningfulChange = meaningfulFields.some(field => {
                        const newFieldVal = JSON.stringify(newVal[field]);
                        const oldFieldVal = JSON.stringify(this.lastControlParamsSnapshot[field]);
                        return newFieldVal !== oldFieldVal;
                    });

                    // Only trigger fetch if meaningful user-initiated changes occurred
                    if (hasMeaningfulChange) {
                        // Clear cursor history when search or filters change
                        if (this.controlParams.searchQuery !== this.lastSearchQuery) {
                            this.controlParams.cursorHistory = [];
                            this.lastSearchQuery = this.controlParams.searchQuery;
                        }
                        this.triggerExternalSource();
                        this.setControlParams();
                    }

                    // Update snapshot after processing
                    this.lastControlParamsSnapshot = this.getControlParamsSnapshot();
                }, 500)
            },

            'controlParams.page'() {
                this.checkPageBoundaries();
            },

            'controlParams.selectedDynamicCols'() {
                this.$refs.elTable.store.updateColumns(); // TODO: Hacky, check for memory leaks.
            },

            'controlParams.searchQuery'(newVal) {
                this.$emit('search-query-changed', newVal);
            },

            lastPage() {
                this.checkPageBoundaries();
            },

            paused(newVal) {
                if (newVal) {
                    this.dataSource.updateParams({ ready: false });
                }
                else {
                    this.triggerExternalSource();
                }
            }
        },

        beforeDestroy() {
            this.setControlParams();
        },

        mounted() {
            // Initialize snapshot on mount to prevent false positives
            this.lastControlParamsSnapshot = this.getControlParamsSnapshot();
            this.triggerExternalSource();
        },

        methods: {
            checkPageBoundaries() {
                if (this.lastPage > 0 && this.controlParams.page > this.lastPage) {
                    this.controlParams.page = this.lastPage;
                }

                if (this.controlParams.page < 1) {
                    this.controlParams.page = 1;
                }
            },

            getControlParams() {
                // Check if we should use cursor pagination based on the data view
                var shouldUseCursorPagination = false;
                if (this.dataView && (this.dataView.hasNextPage || this.dataView.nextCursor)) {
                    shouldUseCursorPagination = true;
                }

                const defaultState = {
                    page: 1,
                    perPage: this.perPage,
                    searchQuery: '',
                    selectedDynamicCols: false,
                    sort: [],
                    cursor: null,
                    paginationMode: 'snapshot',
                    cursorHistory: [], // Store previous cursors for backward navigation
                    useCursorPagination: shouldUseCursorPagination // Auto-detect based on data view
                };

                if (this.defaultSort && this.preventDefaultSort === false) {
                    defaultState.sort = [{
                        field: this.defaultSort.prop,
                        type: this.defaultSort.order === 'ascending' ? 'asc' : 'desc'
                    }];
                }
                else {
                    this.defaultSort = {};
                }

                if (!this.persistKey) {
                    return defaultState;
                }

                const loadedState = localStorage.getItem(this.persistKey);

                try {
                    if (
                        countlyGlobal.member.columnOrder &&
                        countlyGlobal.member.columnOrder[this.persistKey].tableSortMap
                    ) {
                        defaultState.selectedDynamicCols = countlyGlobal.member.columnOrder[this.persistKey].tableSortMap;
                    }

                    if (loadedState) {
                        const parsed = JSON.parse(loadedState);

                        defaultState.page = parsed.page;
                        defaultState.perPage = parsed.perPage;
                        defaultState.sort = parsed.sort;
                    }

                    return defaultState;
                }
                catch (ex) {
                    return defaultState;
                }
            },

            goToFirstPage() {
                if (this.isCursorPagination) {
                    // For cursor pagination, reset to first page by clearing cursor and history
                    this.updateControlParams({
                        page: this.firstPage,
                        cursor: null,
                        cursorHistory: []
                    });
                }
                else {
                    // For traditional pagination (MongoDB), go to first page
                    this.controlParams.page = this.firstPage;
                }
            },

            goToLastPage() {
                if (this.isCursorPagination) {
                    // For cursor pagination, last page navigation is not supported
                    // Users can navigate forward using next cursor
                    return;
                }
                // For traditional pagination (MongoDB), go to last page
                if (this.lastPage > 0) {
                    this.controlParams.page = this.lastPage;
                }
            },

            goToNextPage() {
                if (this.nextAvailable) {
                    if (this.isCursorPagination) {
                        // For cursor pagination, use the nextCursor from the response
                        // Store current cursor in history before moving to next page
                        this.addToCursorHistory();

                        this.updateControlParams({
                            page: this.controlParams.page + 1,
                            cursor: this.dataView.nextCursor
                        });
                    }
                    else {
                        this.controlParams.page++;
                    }
                }
            },

            goToPrevPage() {
                if (this.prevAvailable) {
                    if (this.isCursorPagination) {
                        // Get previous cursor from history
                        const previousCursorData = this.getPreviousCursor();
                        if (previousCursorData) {
                            this.updateControlParams({
                                page: previousCursorData.page,
                                cursor: previousCursorData.cursor
                            });
                        }
                        else if (this.canGoBackToPage1()) {
                            // Find and remove the page 1 entry from history
                            const page1Index = this.controlParams.cursorHistory.findIndex(entry => entry.page === 1);
                            if (page1Index !== -1) {
                                this.controlParams.cursorHistory.splice(page1Index, 1);
                            }
                            this.updateControlParams({
                                page: 1,
                                cursor: null
                            });
                        }
                        else {
                            // Fallback: just go back one page (will show first page data)
                            this.controlParams.page--;
                        }
                    }
                    else {
                        this.controlParams.page--;
                    }
                }
            },
            resetPaginationOnRefresh: function() {
                // Reset to page 1 and clear cursor on page refresh
                this.updateControlParams({
                    page: 1,
                    cursor: null,
                    cursorHistory: []
                });
            },
            addToCursorHistory: function() {
                // Add current cursor to history before navigating to next page
                // For page 1, store null cursor to represent the first page state
                const historyEntry = {
                    page: this.controlParams.page,
                    cursor: this.controlParams.cursor || null
                };
                this.controlParams.cursorHistory.push(historyEntry);
            },
            getPreviousCursor: function() {
                // Get the previous cursor from history
                if (this.controlParams.cursorHistory.length > 0) {
                    const previousCursor = this.controlParams.cursorHistory.pop();
                    return previousCursor;
                }
                return null;
            },
            canGoBackToPage1: function() {
                // Check if we can go back to page 1 (when we have history but no cursor)
                return this.controlParams.cursorHistory.length > 0 &&
                        this.controlParams.cursorHistory.some(entry => entry.page === 1);
            },

            onSortChange(elTableSorting) {
                var updateParams = {};
                if (elTableSorting.order) {
                    updateParams.sort = [{
                        field: elTableSorting.column.sortBy || elTableSorting.prop,
                        type: elTableSorting.order === "ascending" ? "asc" : "desc"
                    }];


                }
                else {
                    updateParams.sort = [];
                }

                // Reset cursor and page when sorting changes in cursor pagination
                if (this.isCursorPagination) {
                    updateParams.cursor = null;
                    updateParams.page = this.firstPage;
                    updateParams.cursorHistory = [];
                }

                this.updateControlParams(updateParams);
            },

            setControlParams() {
                if (this.persistKey) {
                    const localControlParams = {};

                    localControlParams.page = this.controlParams.page;
                    localControlParams.perPage = this.controlParams.perPage;
                    localControlParams.sort = this.controlParams.sort;

                    localStorage.setItem(this.persistKey, JSON.stringify(localControlParams));

                    $.ajax({
                        data: {
                            columnOrderKey: this.persistKey,
                            _csrf: countlyGlobal.csrf_token,
                            tableSortMap: this.controlParams.selectedDynamicCols
                        },
                        success: () => {
                            // NOTE: since countlyGlobal.member does not updates automatically till refresh
                            if (!countlyGlobal.member.columnOrder) {
                                countlyGlobal.member.columnOrder = {};
                            }

                            if (!countlyGlobal.member.columnOrder[this.persistKey]) {
                                countlyGlobal.member.columnOrder[this.persistKey] = {};
                            }

                            countlyGlobal.member.columnOrder[this.persistKey].tableSortMap = this.controlParams.selectedDynamicCols;
                        },
                        type: 'POST',
                        url: `${countlyGlobal.path}/user/settings/column-order`
                    });
                }
            },

            triggerExternalSource() {
                if (!this.dataSource || this.paused) {
                    return;
                }

                if (this.dataSource.fetch) {
                    this.dataSource.fetch(this.controlParams);
                }

                this.$emit('params-change', this.controlParams);
            },
            updateCursorFromResponse: function(response) {
                // Update cursor state from API response
                if (response && response.nextCursor) {
                    // Store current cursor in history if we have one
                    if (this.controlParams.cursor) {
                        this.addToCursorHistory(this.controlParams.cursor);
                    }
                }
            },

            updateControlParams(newParams) {
                _.extend(this.controlParams, newParams);
            },

            getControlParamsSnapshot() {
                // Create a snapshot of meaningful controlParams fields for comparison
                // Excludes internal state fields (cursorHistory, useCursorPagination) that get mutated during pagination
                return {
                    page: this.controlParams.page,
                    perPage: this.controlParams.perPage,
                    searchQuery: this.controlParams.searchQuery,
                    sort: JSON.parse(JSON.stringify(this.controlParams.sort || [])),
                    cursor: this.controlParams.cursor,
                    selectedDynamicCols: JSON.parse(JSON.stringify(this.controlParams.selectedDynamicCols || []))
                };
            }
        }
    };

    var MutationTrackerMixin = {
        data: function() {
            return {
                patches: {},
                hasSelection: false
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
                        var newValue = self.patches[rowKey][fieldKey].newValue;
                        var originalValue = self.patches[rowKey][fieldKey].originalValue;
                        if (newValue !== fields[fieldKey]) {
                            acc[fieldKey] = { originalValue: originalValue, newValue: fields[fieldKey] };
                        }
                    }
                    else if (row[fieldKey] !== fields[fieldKey]) {
                        acc[fieldKey] = { originalValue: row[fieldKey], newValue: fields[fieldKey] };
                    }
                    return acc;
                }, {});

                newPatch = _merge({}, self.patches[rowKey] || {}, newPatch);

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
                            if (patch.originalValue !== patch.newValue) {
                                diff.push({
                                    key: JSON.parse(rowKey),
                                    field: fieldName,
                                    newValue: patch.newValue,
                                    originalValue: patch.originalValue
                                });
                            }
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
            },
            onCellMouseEnter: function(row) {
                if (this.hasSelection) {
                    //If the table is in a selection mode, donot patch
                    //Because if we patch to show action buttons the selection will be lost
                    return;
                }

                var thisRowKey = this.keyOf(row);
                var hovered = this.mutatedRows.filter(function(r) {
                    return r.hover;
                });

                for (var i = 0; i < hovered.length; i++) {
                    var rowKey = this.keyOf(hovered[i]);

                    if (thisRowKey !== rowKey) {
                        this.unpatch(hovered[i], ["hover"]);
                    }
                }

                if (!row.hover) {
                    this.patch(row, {hover: true});
                }
            },
            onSelectionChange: function(selected) {
                this.hasSelection = selected.length ? true : false;
                if (!this.hasSelection) {
                    this.removeHovered();
                }
            },
            onNoCellMouseEnter: function() {
                if (this.hasSelection) {
                    //If the table is in a selection mode, donot unpatch
                    //Because if we unpatch to hide action buttons selection will be lost on unpatch
                    return;
                }

                this.removeHovered();
            },
            removeHovered: function() {
                var hovered = this.mutatedRows.filter(function(r) {
                    return r.hover;
                });

                for (var i = 0; i < hovered.length; i++) {
                    this.unpatch(hovered[i], ["hover"]);
                }
            }
        }
    };

    var ExportHandlerMixin = {
        props: {
            exportQuery: {
                type: Function,
                default: null,
                required: false
            },
            showLimitOptions: {
                type: Boolean,
                default: false,
                required: false
            },
            exportAllRows: {
                type: Boolean,
                default: false,
                required: false
            },
            exportLimit: {
                type: Number,
                default: countlyGlobal.config.export_limit,
                required: false
            },
            exportApi: {
                type: Function,
                default: null,
                required: false
            },
            exportFormat: {
                type: Function,
                default: null,
                required: false
            },
            exportColumnSelection: {
                type: Boolean,
                default: false,
                required: false
            },
            hasExport: {
                type: Boolean,
                default: true,
                required: false
            },
            customFileName: {
                type: String,
                default: null,
                required: false
            },
            customExportFileName: {
                type: Boolean,
                default: true,
                required: false
            }
        },
        watch: {
            customFileName: function(newVal) {
                this.exportFileName = newVal;
            }
        },
        mounted: function() {
            var self = this;
            this.$root.$on("cly-date-change", function() {
                self.exportFileName = this.customFileName || self.getDefaultFileName();
            });

        },
        data: function() {
            return {
                selectedExportColumns: null,
                selectedExportType: 'csv',
                availableExportTypes: [
                    {'name': '.CSV', value: 'csv'},
                    {'name': '.JSON', value: 'json'},
                    {'name': '.XLSX', value: 'xlsx'}
                ],
                searchQuery: '',
                exportFileName: this.customFileName || this.getDefaultFileName(),
            };
        },
        methods: {
            onExportClick: function() {
                this.initiateExport({
                    type: this.selectedExportType,
                    limit: this.exportAllRows ? -1 : this.exportLimit
                });
            },
            getDefaultFileName: function() {
                var siteName = countlyGlobal.countlyTitle;
                var sectionName = "";
                var selectedMenuItem = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                if (selectedMenuItem && selectedMenuItem.item && selectedMenuItem.item.title) {
                    sectionName = this.i18n(selectedMenuItem.item.title);
                }
                var appName = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].name;
                var date = countlyCommon.getDateRangeForCalendar();

                var filename = siteName + " - " + appName + " - " + sectionName + " " + "(" + date + ")";
                return filename;
            },
            getLocalExportContent: function() {
                if (this.exportFormat) {
                    return this.exportFormat(this.rows);
                }
                else {
                    return this.formatExportFunction();
                }
            },
            getOrderedDataForExport: function() {
                var currentArray = this.localSearchedRows;
                if (this.controlParams.sort.length > 0) {
                    var sorting = this.controlParams.sort[0],
                        dir = sorting.type === "asc" ? 1 : -1;

                    currentArray = currentArray.slice();
                    currentArray.sort(function(a, b) {
                        var priA = a[sorting.field],
                            priB = b[sorting.field];

                        if (typeof priA === 'object' && priA !== null && priA.sortBy) {
                            priA = priA.sortBy;
                            priB = priB.sortBy;
                        }

                        if (priA < priB) {
                            return -dir;
                        }
                        if (priA > priB) {
                            return dir;
                        }
                        return 0;
                    });
                }
                return currentArray;
            },
            formatExportFunction: function() {
                var rows = this.getOrderedDataForExport();
                if (rows && rows.length && this.$refs.elTable && this.$refs.elTable.columns && this.$refs.elTable.columns.length) {
                    var table = [];
                    var columns = this.$refs.elTable.columns;
                    columns = columns.filter(object => (Object.prototype.hasOwnProperty.call(object, "label") && Object.prototype.hasOwnProperty.call(object, "property") && typeof object.label !== "undefined" && typeof object.property !== "undefined"));
                    for (var r = 0; r < rows.length; r++) {
                        var item = {};
                        for (var c = 0; c < columns.length; c++) {
                            var property;
                            if (columns[c].columnKey && columns[c].columnKey.length) {
                                var columnKey = columns[c].columnKey;
                                if (columnKey.includes(".")) {
                                    property = rows[r];
                                    var dotSplittedArr = columnKey.split(".");
                                    for (var i = 0; i < dotSplittedArr.length; i++) {
                                        if (property[dotSplittedArr[i]]) {
                                            property = property[dotSplittedArr[i]];
                                        }
                                    }
                                }
                                else {
                                    property = rows[r][columnKey];
                                }
                            }
                            else {
                                property = rows[r][columns[c].property];
                            }
                            item[columns[c].label.toUpperCase()] = countlyCommon.unescapeHtml(property);
                        }
                        table.push(item);
                    }
                    return table;
                }
                else {
                    return this.rows;
                }
            },
            initiateExport: function(params) {
                var formData = null,
                    url = null;
                if (this.exportApi) {
                    formData = this.exportApi(params);
                    formData.type = params.type;
                    url = countlyCommon.API_URL + (formData.url || "/o/export/request");
                    if (this.exportFileName) {
                        formData.filename = this.exportFileName;
                    }
                }
                else if (this.exportQuery) {
                    formData = this.exportQuery();
                    formData.type = params.type;
                    if (formData.limit) {
                        formData.limit = params.limit;
                    }
                    if (this.exportFileName) {
                        formData.filename = this.exportFileName;
                    }
                    url = countlyCommon.API_URL + (formData.url || "/o/export/db");
                }
                else if (this.dataSource) { // default export logic for server tables
                    url = countlyCommon.API_URL + "/o/export/request";

                    var addr = this.dataSource.requestAddress;
                    var lastRequest = addr.store.getters[addr.path];

                    var path = lastRequest.url + "?" + (Object.keys(lastRequest.data).reduce(function(acc, key) {
                        if (key !== "iDisplayLength" && key !== "iDisplayStart" && key !== "sEcho") {
                            if (typeof lastRequest.data[key] === 'string') {
                                acc.push(key + "=" + encodeURIComponent(lastRequest.data[key]));
                            }
                            else {
                                acc.push(key + "=" + encodeURIComponent(JSON.stringify(lastRequest.data[key])));
                            }
                        }
                        return acc;
                    }, ["api_key=" + countlyGlobal.member.api_key]).join("&"));

                    formData = {
                        type: params.type,
                        path: path,
                        prop: "aaData",
                        filename: this.exportFileName,
                        api_key: countlyGlobal.member.api_key
                    };
                }
                else {
                    url = countlyCommon.API_URL + "/o/export/data";
                    formData = {
                        type: params.type,
                        data: JSON.stringify(this.getLocalExportContent()),
                        filename: this.exportFileName,
                        api_key: countlyGlobal.member.api_key
                    };
                }
                if (!formData.filename) {
                    formData.filename = this.exportFileName;
                }

                if (formData.url === "/o/export/requestQuery") {
                    if (Array.isArray(formData.prop)) {
                        formData.prop = formData.prop.join(",");
                    }
                    $.ajax({
                        type: "POST",
                        url: url,
                        data: formData,
                        success: function(result) {
                            var task_id = null;
                            var fileid = null;
                            if (result && result.result && result.result.task_id) {
                                task_id = result.result.task_id;
                                countlyTaskManager.monitor(task_id);
                                CountlyHelpers.displayExportStatus(null, fileid, task_id);
                            }
                        },
                        error: function(xhr, status, error) {
                            var filename = null;
                            if (xhr && xhr.responseText && xhr.responseText !== "") {
                                var ob = JSON.parse(xhr.responseText);
                                if (ob.result && ob.result.message) {
                                    error = ob.result.message;
                                }
                                if (ob.result && ob.result.filename) {
                                    filename = ob.result.filename;
                                }
                            }
                            CountlyHelpers.displayExportStatus(error, filename, null);
                        }
                    });
                }
                else {
                    var form = $('<form method="POST" action="' + url + '">');
                    $.each(formData, function(k, v) {
                        if (CountlyHelpers.isJSON(v)) {
                            form.append($('<textarea style="visibility:hidden;position:absolute;display:none;" name="' + k + '">' + v + '</textarea>'));
                        }
                        else {
                            form.append($('<input type="hidden" name="' + k + '" value="' + v + '">'));
                        }
                    });
                    $('body').append(form);
                    form.submit();
                }
            },
            getMatching: function(options) {
                if (!this.searchQuery) {
                    return options;
                }
                var self = this;
                var query = (self.searchQuery + "").toLowerCase();
                return options.filter(function(option) {
                    if (!option) {
                        return false;
                    }
                    var compareTo = option.label || option.value || "";
                    return compareTo.toLowerCase().indexOf(query) > -1;
                });
            }
        },
        computed: {
            exportColumns: {
                get: function() {
                    return this.selectedExportColumns || this.controlParams.selectedDynamicCols;
                },
                set: function(val) {
                    this.selectedExportColumns = val;
                }
            },
            exportAllColumns: {
                get: function() {
                    return this.exportColumns.length === this.availableDynamicCols.length;
                },
                set: function(val) {
                    if (val) {
                        this.exportColumns = this.availableDynamicCols.map(function(c) {
                            return c.value;
                        });
                    }
                    else {
                        this.exportColumns = [];
                    }
                }
            }
        }
    };

    Vue.component("cly-datatable-n", countlyVue.components.create({
        mixins: [
            _mixins.commonFormatters,
            _mixins.i18n,
            TableExtensionsMixin,
            MutationTrackerMixin,
            OverlayRowMixin,
            ExportHandlerMixin
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
            },
            hideTop: {
                type: Boolean,
                default: false
            },
            hideBottom: {
                type: Boolean,
                default: false
            },
            forceLoading: {
                type: Boolean,
                default: false,
                required: false
            },
            testId: {
                type: String,
                default: 'cly-datatable-n-test-id',
                required: false
            },
            sortable: {
                type: Boolean,
                default: false
            },
            displayMode: {
                type: String,
                default: null,
                validator: function(value) {
                    return ['list', /** add others if needed */].indexOf(value) !== -1;
                }
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
                },
            };
        },
        computed: {
            searchQueryProxy: {
                get: function() {
                    if (this.displaySearch) {
                        return this.controlParams.searchQuery;
                    }
                    return '';
                },
                set: function(query) {
                    if (this.displaySearch) {
                        _.extend(this.controlParams, { searchQuery: query, page: 1});
                    }
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
                if (this.externalParams && this.externalParams.skipLoading) {
                    return false;
                }
                if (this.forceLoading === true) {
                    return true;
                }
                if (!this.dataSource) {
                    return false;
                }
                return this.externalStatus !== 'ready' || (this.externalParams && !this.externalParams.ready);
            },
            classes: function() {
                var classes = [];
                if (!this.forceLoading && this.dataSource && this.externalStatus === 'silent-pending') {
                    classes.push("silent-loading");
                }
                if (this.displayMode) {
                    classes.push("display-mode--" + this.displayMode);
                }
                return classes;
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
        template: CV.T('/javascripts/countly/vue/templates/datatable.html'),
        mounted: function() {
            var self = this;
            this.resetPaginationOnRefresh();
            if (this.sortable) {
                const table = document.querySelector('.el-table__body-wrapper tbody');
                Sortable.create(table, {
                    animation: 150,
                    handle: '.el-table__row',
                    onStart({oldIndex}) {
                        self.$emit('drag-start', oldIndex);
                    },
                    onEnd({ newIndex, oldIndex }) {
                        self.$emit('drag-end', { newIndex, oldIndex });
                    }
                });
            }
        }
    }));

    Vue.component("cly-datatable-undo-row", countlyBaseComponent.extend({
        props: {
            delayedAction: {
                type: Object
            },
        },
        template: '<div @click.stop v-if="delayedAction" class="undo-row">\n' +
                        '<slot></slot>\n' +
                        '<a @click.stop="delayedAction.abort()">Undo.</a>\n' +
                    '</div>\n'
    }));

}(window.countlyVue = window.countlyVue || {}, jQuery));
