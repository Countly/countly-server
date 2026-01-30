import _ from 'lodash';
import jQuery from 'jquery';
import countlyCommon from '../../../countly/countly.common';
import countlyGlobal from '../../../countly/countly.global';

export default {
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
                return this.dataView.hasNextPage && this.dataView.nextCursor;
            }
            return this.controlParams.page < this.lastPage;
        },

        lastPageAvailable() {
            return !this.isCursorPagination && this.lastPage > 1 && this.controlParams.page < this.lastPage;
        },

        pageSelectionAvailable() {
            return !this.isCursorPagination && this.lastPage > 1;
        },

        isCursorPagination() {
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
                if (currentRows > 0) {
                    var cursorStartEntries = (page - 1) * perPage + 1,
                        cursorEndEntries = cursorStartEntries + currentRows - 1;

                    if (filteredTotal > 0 && !this.dataView.isApproximate) {
                        info = this.i18n("common.showing")
                            .replace("_START_", countlyCommon.formatNumber(cursorStartEntries))
                            .replace("_END_", countlyCommon.formatNumber(cursorEndEntries))
                            .replace("_TOTAL_", countlyCommon.formatNumber(filteredTotal));
                    }
                    else {
                        info = "Showing " + countlyCommon.formatNumber(cursorStartEntries) + " to " + countlyCommon.formatNumber(cursorEndEntries) + " entries";
                        if (this.dataView.isApproximate && filteredTotal > 0) {
                            info += " (≈" + countlyCommon.formatNumber(filteredTotal) + " total)";
                        }
                    }
                }
            }
            else {
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
                if (!this.lastControlParamsSnapshot) {
                    this.lastControlParamsSnapshot = this.getControlParamsSnapshot();
                    return;
                }

                const meaningfulFields = ['page', 'perPage', 'searchQuery', 'sort', 'cursor', 'selectedDynamicCols'];
                const hasMeaningfulChange = meaningfulFields.some(field => {
                    const newFieldVal = JSON.stringify(newVal[field]);
                    const oldFieldVal = JSON.stringify(this.lastControlParamsSnapshot[field]);
                    return newFieldVal !== oldFieldVal;
                });

                if (hasMeaningfulChange) {
                    if (this.controlParams.searchQuery !== this.lastSearchQuery) {
                        this.controlParams.cursorHistory = [];
                        this.lastSearchQuery = this.controlParams.searchQuery;
                    }
                    this.triggerExternalSource();
                    this.setControlParams();
                }

                this.lastControlParamsSnapshot = this.getControlParamsSnapshot();
            }, 500)
        },

        'controlParams.page'() {
            this.checkPageBoundaries();
        },

        'controlParams.selectedDynamicCols'() {
            this.$refs.elTable.store.updateColumns();
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
                cursorHistory: [],
                useCursorPagination: shouldUseCursorPagination
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
                this.updateControlParams({
                    page: this.firstPage,
                    cursor: null,
                    cursorHistory: []
                });
            }
            else {
                this.controlParams.page = this.firstPage;
            }
        },

        goToLastPage() {
            if (this.isCursorPagination) {
                return;
            }
            if (this.lastPage > 0) {
                this.controlParams.page = this.lastPage;
            }
        },

        goToNextPage() {
            if (this.nextAvailable) {
                if (this.isCursorPagination) {
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
                    const previousCursorData = this.getPreviousCursor();
                    if (previousCursorData) {
                        this.updateControlParams({
                            page: previousCursorData.page,
                            cursor: previousCursorData.cursor
                        });
                    }
                    else if (this.canGoBackToPage1()) {
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
                        this.controlParams.page--;
                    }
                }
                else {
                    this.controlParams.page--;
                }
            }
        },

        resetPaginationOnRefresh() {
            this.updateControlParams({
                page: 1,
                cursor: null,
                cursorHistory: []
            });
        },

        addToCursorHistory() {
            const historyEntry = {
                page: this.controlParams.page,
                cursor: this.controlParams.cursor || null
            };
            this.controlParams.cursorHistory.push(historyEntry);
        },

        getPreviousCursor() {
            if (this.controlParams.cursorHistory.length > 0) {
                const previousCursor = this.controlParams.cursorHistory.pop();
                return previousCursor;
            }
            return null;
        },

        canGoBackToPage1() {
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

                jQuery.ajax({
                    data: {
                        columnOrderKey: this.persistKey,
                        _csrf: countlyGlobal.csrf_token,
                        tableSortMap: this.controlParams.selectedDynamicCols
                    },
                    success: () => {
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

        updateCursorFromResponse(response) {
            if (response && response.nextCursor) {
                if (this.controlParams.cursor) {
                    this.addToCursorHistory(this.controlParams.cursor);
                }
            }
        },

        updateControlParams(newParams) {
            _.extend(this.controlParams, newParams);
        },

        getControlParamsSnapshot() {
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
