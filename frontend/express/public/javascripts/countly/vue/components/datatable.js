/* global jQuery, Vue, _, CV, countlyCommon, countlyGlobal, CountlyHelpers, moment, countlyTaskManager */

(function(countlyVue, $) {

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
            },
            paused: {
                type: Boolean,
                default: false
            },
            displaySearch: {
                type: Boolean,
                default: true
            },
            defaultSort: {
                type: Object,
                default: null,
                required: false
            },
            rowClassName: {
                type: [String, Function]
            },
            headerRowClassName: {
                type: [String, Function]
            },
            isClickable: {
                type: Boolean,
                default: false
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
            externalParams: function() {
                if (!this.dataSource) {
                    return undefined;
                }
                var addr = this.dataSource.paramsAddress;
                return addr.store.getters[addr.path];
            },
            availablePages: function() {
                var pages = [];
                for (var i = this.firstPage, I = Math.min(this.lastPage, 10000); i <= I; i++) {
                    pages.push(i);
                }
                return pages;
            },
            rowClasses: function() {
                var rowClass = "";
                if (this.rowClassName) {
                    if (typeof (this.rowClassName) === "string" && this.rowClassName.length) {
                        return rowClass + " " + this.rowClassName;
                    }

                    if (typeof (this.rowClassName) === "function") {
                        return rowClass + " " + this.rowClassName();
                    }
                }
                return rowClass;
            },
            headerClasses: function() {
                var headerClass = "";
                if (this.headerRowClassName) {
                    if (typeof (this.headerRowClassName) === "string" && this.headerRowClassName.length) {
                        return headerClass + " " + this.headerRowClassName;
                    }

                    if (typeof (this.headerRowClassName) === "function") {
                        return headerClass + " " + this.headerRowClassName();
                    }
                }
                return headerClass;
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
            },
            paused: function(newVal) {
                if (newVal) {
                    this.dataSource.updateParams({
                        ready: false
                    });
                }
                else {
                    this.triggerExternalSource();
                }
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
                if (this.controlParams.page < 1) {
                    this.controlParams.page = 1;
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
                if (!this.dataSource || this.paused) {
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

                if (this.defaultSort) {
                    defaultState.sort = [{
                        field: this.defaultSort.prop,
                        type: this.defaultSort.order === "ascending" ? "asc" : "desc"
                    }];
                }

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

    var ExportHandlerMixin = {
        props: {
            exportQuery: {
                type: Function,
                default: null,
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
            }
        },
        data: function() {
            return {
                hasExport: true,
                selectedExportType: 'csv',
                availableExportTypes: [
                    {'name': '.CSV', value: 'csv'},
                    {'name': '.JSON', value: 'json'},
                    {'name': '.XLSX', value: 'xlsx'}
                ]
            };
        },
        methods: {
            onExportClick: function() {
                this.initiateExport({
                    type: this.selectedExportType
                });
            },
            getDefaultFileName: function(params) {
                var name = "countly";
                if (params.title) {
                    name = params.title.replace(/[\r\n]+/g, "");
                }
                if (params.timeDependent) {
                    //include export range
                    name += "_for_" + countlyCommon.getDateRange();
                }
                else {
                    //include export date
                    name += "_on_" + moment().format("DD-MMM-YYYY");
                }
                return (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
            },
            getLocalExportContent: function() {
                if (this.exportFormat) {
                    return this.exportFormat(this.rows);
                }
                return this.rows;
            },
            initiateExport: function(params) {

                var formData = null,
                    url = null;

                if (this.exportApi) {
                    formData = this.exportApi();
                    url = countlyCommon.API_URL + (formData.url || "/o/export/request");
                }
                else if (this.exportQuery) {
                    formData = this.exportQuery();
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
                        filename: this.getDefaultFileName(params),
                        api_key: countlyGlobal.member.api_key
                    };
                }
                else {
                    url = countlyCommon.API_URL + "/o/export/data";
                    formData = {
                        type: params.type,
                        data: JSON.stringify(this.getLocalExportContent()),
                        filename: this.getDefaultFileName(params),
                        api_key: countlyGlobal.member.api_key
                    };
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
            }
        }
    };

    Vue.component("cly-datatable-n", countlyVue.components.create({
        mixins: [
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
                return this.externalStatus !== 'ready' || (this.externalParams && !this.externalParams.ready);
            },
            classes: function() {
                var classes = [];
                if (this.dataSource && this.externalStatus === 'silent-pending') {
                    classes.push("silent-loading");
                }

                if (this.isClickable) {
                    classes.push("cly-vue-eldatatable__is-clickable");
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
        template: CV.T('/javascripts/countly/vue/templates/datatable.html')
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
