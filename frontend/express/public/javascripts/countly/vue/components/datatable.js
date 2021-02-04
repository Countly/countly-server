/* global jQuery, Vue, moment, countlyCommon, countlyGlobal, CountlyHelpers, _ */

(function(countlyVue, $) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var clyDataTableControls = countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        template: '<div class="cly-vgt-custom-controls">\n' +
                        '<div class="cly-vgt-custom-search">\n' +
                            '<div class="magnifier-wrapper" @click="toggleSearch">\n' +
                                '<i class="fa fa-search"></i>\n' +
                            '</div>\n' +
                            '<input type="text" ref="searchInput" v-show="searchVisible" class="vgt-input" :placeholder="i18n(\'common.search\')" v-bind:value="searchQuery" @input="queryChanged($event.target.value)"/>\n' +
                            '<slot name="search-options"></slot>\n' +
                        '</div>\n' +
                        '<div class="cly-vgt-custom-paginator">\n' +
                            '<div class="display-items">\n' +
                                '<label>{{ i18n("common.show-items") }} <input type="number" v-model.number="displayItems"></label>\n' +
                            '</div>\n' +
                            '<div class="buttons">\n' +
                                '<span :class="{disabled: !prevAvailable}" @click="goToFirstPage"><i class="fa fa-angle-double-left"></i></span>\n' +
                                '<span :class="{disabled: !prevAvailable}" @click="goToPrevPage"><i class="fa fa-angle-left"></i></span>\n' +
                                '<span :class="{disabled: !nextAvailable}" @click="goToNextPage"><i class="fa fa-angle-right"></i></span>\n' +
                                '<span :class="{disabled: !nextAvailable}" @click="goToLastPage"><i class="fa fa-angle-double-right"></i></span>\n' +
                            '</div>\n' +
                            '<div class="export-toggler" @click.stop="toggleExportDialog"><i class="fa fa-download"></i></div>\n' +
                        '</div>\n' +
                        '<div class="export-dialog-container" v-if="isExportDialogOpened" v-click-outside="closeExportDialog">\n' +
                            '<div class="export-dialog">\n' +
                                '<p>{{i18n("export.export-as")}}</p>\n' +
                                '<div class="button-selector light">\n' +
                                    '<div class="button" @click="selectedExportType = \'csv\'" :class="{active: selectedExportType === \'csv\'}">.CSV</div>\n' +
                                    '<div class="button" @click="selectedExportType = \'xlsx\'" :class="{active: selectedExportType === \'xlsx\'}">.XLSX</div>\n' +
                                    '<div class="button" @click="selectedExportType = \'json\'" :class="{active: selectedExportType === \'json\'}">.JSON</div>\n' +
                                '</div>\n' +
                                '<cly-button skin="green" @click="exportData" :label="i18n(\'export.export\')"></cly-button>\n' +
                            '</div>\n' +
                        '</div>\n' +
                    '</div>',
        props: {
            searchQuery: {
                type: String
            },
            pageChanged: {
                type: Function,
            },
            perPageChanged: {
                type: Function,
            },
            total: {
                type: Number
            },
            notFilteredTotal: {
                type: Number
            },
            initialPaging: {
                type: Object
            }
        },
        data: function() {
            return {
                firstPage: 1,
                currentPage: this.initialPaging.page,
                perPage: this.initialPaging.perPage,
                searchVisible: !!this.searchQuery,
                displayItems: this.initialPaging.perPage,
                isExportDialogOpened: false,
                selectedExportType: 'csv'
            };
        },
        computed: {
            totalPages: function() {
                return Math.ceil(this.total / this.perPage);
            },
            lastPage: function() {
                return this.totalPages;
            },
            prevAvailable: function() {
                return this.currentPage > this.firstPage;
            },
            nextAvailable: function() {
                return this.currentPage < this.lastPage;
            }
        },
        mounted: function() {
            // this.updatePerPage();
            // this.goToFirstPage();
            this.updateInfo();
        },
        methods: {
            queryChanged: function(newSearchQuery) {
                var self = this;
                this.$emit("queryChanged", newSearchQuery);
                this.$nextTick(function() {
                    self.updateInfo();
                });
            },
            toggleSearch: function() {
                var self = this;
                this.searchVisible = !this.searchVisible;
                this.$nextTick(function() {
                    if (self.searchVisible) {
                        self.$refs.searchInput.focus();
                    }
                });
            },
            updateInfo: function() {
                var startEntries = (this.currentPage - 1) * this.perPage + 1,
                    endEntries = Math.min(startEntries + this.perPage - 1, this.total),
                    totalEntries = this.total,
                    info = this.i18n("common.table.no-data");

                if (totalEntries > 0) {
                    info = this.i18n("common.showing")
                        .replace("_START_", startEntries)
                        .replace("_END_", endEntries)
                        .replace("_TOTAL_", totalEntries);
                }

                if (this.searchQuery) {
                    info += " " + this.i18n("common.filtered").replace("_MAX_", this.notFilteredTotal);
                }

                this.$emit("infoChanged", info);
            },
            updateCurrentPage: function() {
                var self = this;
                this.pageChanged({currentPage: this.currentPage});
                this.$nextTick(function() {
                    self.updateInfo();
                });
            },
            updatePerPage: function() {
                var self = this;
                this.perPageChanged({currentPerPage: this.perPage});
                this.$nextTick(function() {
                    self.updateInfo();
                });
            },
            goToFirstPage: function() {
                this.currentPage = this.firstPage;
            },
            goToLastPage: function() {
                this.currentPage = this.lastPage;
            },
            goToPrevPage: function() {
                if (this.prevAvailable) {
                    this.currentPage--;
                }
            },
            goToNextPage: function() {
                if (this.nextAvailable) {
                    this.currentPage++;
                }
            },
            closeExportDialog: function() {
                this.isExportDialogOpened = false;
            },
            toggleExportDialog: function() {
                this.isExportDialogOpened = !this.isExportDialogOpened;
            },
            exportData: function() {
                this.$emit("exportData", this.selectedExportType);
                this.closeExportDialog();
            }
        },
        watch: {
            displayItems: function(newValue) {
                if (newValue > 0) {
                    this.perPage = newValue;
                }
            },
            perPage: function() {
                this.updatePerPage();
            },
            currentPage: function() {
                this.updateCurrentPage();
            },
            totalPages: function(newTotal) {
                if (this.currentPage > newTotal) {
                    this.goToFirstPage();
                }
            },
            total: function() {
                this.updateInfo();
            }
        }
    });

    var clyDataTableRowOptions = countlyBaseComponent.extend({
        props: {
            items: {
                type: Array
            },
            opened: {
                type: Boolean
            },
            pos: {
                type: Object
            },
            rowData: {
                type: Object
            }
        },
        computed: {
            availableItems: function() {
                return this.items.filter(function(item) {
                    return !item.disabled;
                });
            }
        },
        methods: {
            tryClosing: function() {
                if (this.opened) {
                    this.$emit("close");
                }
            },
            fireEvent: function(eventKey) {
                this.$emit(eventKey, this.rowData);
                this.tryClosing();
            }
        },
        template: '<div class="cly-vue-row-options" v-click-outside="tryClosing">\n' +
                        '<div ref="menu" v-bind:style="{ right: pos.right, top: pos.top}" :class="{active: opened}" class="menu" tabindex="1">\n' +
                            '<a @click="fireEvent(item.event)" v-for="(item, index) in availableItems" class="item" :key="index"><i :class="item.icon"></i><span>{{ item.label }}</span></a>\n' +
                        '</div>\n' +
                    '</div>'
    });

    var exportTableData = function(params) {

        /** gets file name for export
        * @returns {string} file name
        */
        function getFileName() {
            var name = "countly";
            if (params.settings.title) {
                name = params.settings.title.replace(/[\r\n]+/g, "");
            }
            if (params.settings.timeDependent) {
                //include export range
                name += "_for_" + countlyCommon.getDateRange();
            }
            else {
                //include export date
                name += "_on_" + moment().format("DD-MMM-YYYY");
            }
            return (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
        }

        /** gets export data from data table
        * @returns {array} table data
        */
        function getExportData() {
            var retData = [];
            params.rows.forEach(function(row) {
                var ob = {};
                params.columns.forEach(function(col) {
                    try {
                        if (!(row && Object.prototype.hasOwnProperty.call(row, col.field)) || (col && col.noExport)) {
                            return;
                        }
                        ob[col.label] = row[col.field];
                    }
                    catch (e) {
                        //not important
                    }
                });
                retData.push(ob);
            });
            return retData;
        }
        var formData = null,
            url = null;

        if (params.settings.resourcePath) {
            url = countlyCommon.API_URL + "/o/export/request";
            formData = {
                type: params.type,
                path: params.settings.resourcePath,
                prop: params.settings.resourceProp,
                filename: getFileName(),
                api_key: countlyGlobal.member.api_key
            };
        }
        else {
            url = countlyCommon.API_URL + "/o/export/data";
            formData = {
                type: params.type,
                data: JSON.stringify(getExportData()),
                filename: getFileName(),
                api_key: countlyGlobal.member.api_key
            };
        }

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
    };

    Vue.component("cly-datatable", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n
        ],
        inheritAttrs: false,
        components: {
            "custom-controls": clyDataTableControls,
            'row-options': clyDataTableRowOptions
        },
        props: {
            rows: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            columns: {
                type: Array
            },
            mode: {
                type: String,
                default: null
            },
            totalRows: {
                type: Number,
                default: 0
            },
            notFilteredTotalRows: {
                type: Number,
                default: 0
            },
            persistKey: {
                type: String,
                default: null
            },
            striped: {
                type: Boolean,
                default: true
            },
            exportSettings: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        computed: {
            forwardedSlots: function() {
                var self = this;
                return Object.keys(this.$scopedSlots).reduce(function(slots, slotKey) {
                    if (slotKey !== "search-options") {
                        slots[slotKey] = self.$scopedSlots[slotKey];
                    }
                    return slots;
                }, {});
            },
            controlSlots: function() {
                if (this.$scopedSlots["search-options"]) {
                    return {
                        "search-options": this.$scopedSlots["search-options"]
                    };
                }
                return {};
            },
            innerStyles: function() {
                var styles = ['cly-vgt-table'];
                if (this.striped) {
                    styles.push("striped");
                }
                return styles.join(" ");
            },
            notFilteredTotal: function() {
                if (this.isRemote) {
                    return this.notFilteredTotalRows;
                }
                else if (!this.rows) {
                    return 0;
                }
                return this.rows.length;
            },
            extendedColumns: function() {
                var extended = this.columns.map(function(col) {
                    var newCol;
                    if (col.type === "cly-options") {
                        newCol = JSON.parse(JSON.stringify(col));
                        newCol.field = "cly-options";
                        newCol.sortable = false;
                        delete newCol.type;
                        return newCol;
                    }
                    if (col.type === "cly-detail-toggler") {
                        newCol = JSON.parse(JSON.stringify(col));
                        newCol.field = "cly-detail-toggler";
                        newCol.sortable = false;
                        delete newCol.type;
                        return newCol;
                    }
                    return col;
                });
                return extended;
            },
            isRemote: function() {
                return this.internalMode === "remote";
            },
            internalTotalRows: function() {
                if (this.isRemote) {
                    return this.totalRows;
                }
                else {
                    // vgt-table should determine itself.
                    return undefined;
                }
            }
        },
        created: function() {
            if (this.isRemote) {
                this.$emit("remote-params-change", this.currentParams);
            }
        },
        data: function() {
            var persisted = this.getPersistedParams();
            return {
                pageInfo: '',
                searchQuery: persisted.searchQuery,
                optionsOpened: false,
                optionsRowData: {},
                optionsItems: [],
                optionsPosition: {
                    right: '41px',
                    top: '0'
                },
                isLoading: false,
                internalMode: this.mode,
                initialPaging: {
                    page: persisted.page,
                    perPage: persisted.perPage
                },
                currentParams: persisted
            };
        },
        methods: {
            getPersistedParams: function() {
                var loadedState = localStorage.getItem(this.persistKey);
                var defaultState = {
                    page: 1,
                    perPage: 10,
                    searchQuery: '',
                    sort: []
                };
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
            persistParams: function() {
                if (this.persistKey) {
                    localStorage.setItem(this.persistKey, JSON.stringify(this.currentParams));
                }
            },
            onInfoChanged: function(text) {
                this.pageInfo = text;
            },
            setRowData: function(row, fields) {
                this.$emit("set-row-data", row, fields);
            },
            showRowOptions: function(event, items, row) {
                var rect = $(event.target).offset(),
                    self = this;

                this.optionsPosition = {
                    right: '41px',
                    top: (rect.top + 41) + "px"
                };
                this.optionsItems = items;
                this.optionsRowData = row;

                self.$nextTick(function() {
                    self.optionsOpened = true;
                });
            },
            addTableFns: function(propsObj) {
                var newProps = {
                    props: propsObj,
                    fns: {
                        showRowOptions: this.showRowOptions,
                        setRowData: this.setRowData
                    }
                };
                return newProps;
            },
            updateParams: function(props) {
                this.currentParams = Object.assign({}, this.currentParams, props);
                if (this.isRemote) {
                    this.$emit("remote-params-change", this.currentParams);
                }
                this.persistParams();
            },
            onPageChange: function(params) {
                this.updateParams({page: params.currentPage});
            },
            onSortChange: function(params) {
                this.updateParams({sort: params});
            },
            onRowClick: function(params) {
                this.$emit("row-click", params);
            },
            onRowMouseover: function(params) {
                this.$emit("row-mouseover", params);
            },
            onRowMouseleave: function(params) {
                this.$emit("row-mouseleave", params);
            },
            onPerPageChange: _.debounce(function(params) {
                this.updateParams({perPage: params.currentPerPage});
            }, 500),
            exportData: function(type) {
                exportTableData({
                    rows: this.$refs.table.processedRows[0].children,
                    columns: this.columns,
                    type: type,
                    settings: this.exportSettings
                });
            }
        },
        watch: {
            searchQuery: _.debounce(function(newVal) {
                this.updateParams({searchQuery: newVal});
                if (this.isRemote) {
                    this.isLoading = true;
                }
            }, 500)
        },
        template: '<div>\n' +
                        '<row-options\n' +
                            ':items="optionsItems"\n' +
                            ':pos="optionsPosition"\n' +
                            ':opened="optionsOpened"\n' +
                            ':rowData="optionsRowData"\n' +
                            '@close="optionsOpened=false"\n' +
                            'v-on="$listeners">\n' +
                        '</row-options>\n' +
                        '<vue-good-table\n' +
                            'v-bind="$attrs"\n' +
                            'v-bind:rows="rows"\n' +
                            'v-bind:columns="extendedColumns"\n' +
                            'v-on="$listeners"\n' +
                            ':pagination-options="{\n' +
                                'enabled: true,\n' +
                                'mode: \'records\',\n' +
                                'position: \'top\'\n' +
                            '}"\n' +
                            ':search-options="{\n' +
                                'enabled: true,\n' +
                                'externalQuery: searchQuery\n' +
                            '}"\n' +
                            '@on-page-change="onPageChange"\n' +
                            '@on-sort-change="onSortChange"\n' +
                            '@on-per-page-change="onPerPageChange"\n' +
                            '@on-row-mouseenter="onRowMouseover"\n' +
                            '@on-row-mouseleave="onRowMouseleave"\n' +
                            '@on-row-click="onRowClick"\n' +
                            'ref="table"\n' +
                            ':mode="internalMode"\n' +
                            ':totalRows="internalTotalRows"\n' +
                            ':isLoading.sync="isLoading"\n' +
                            ':styleClass="innerStyles">\n' +
                                '<template v-slot:pagination-top="props">\n' +
                                    '<custom-controls\n' +
                                    '@infoChanged="onInfoChanged"\n' +
                                    '@queryChanged="searchQuery = $event"\n' +
                                    '@exportData="exportData"\n' +
                                    'ref="controls"\n' +
                                    ':initial-paging="initialPaging"\n' +
                                    ':search-query="searchQuery"\n' +
                                    ':total="props.total"\n' +
                                    ':notFilteredTotal="notFilteredTotal"\n' +
                                    ':pageChanged="props.pageChanged"\n' +
                                    ':perPageChanged="props.perPageChanged">\n' +
                                    '<template v-for="(_, name) in controlSlots" v-slot:[name]="slotData">\n' +
                                        '<slot :name="name" v-bind="addTableFns(slotData)" />\n' +
                                    '</template>\n' +
                                    '</custom-controls>\n' +
                                '</template>\n' +
                                '<template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">\n' +
                                    '<slot :name="name" v-bind="addTableFns(slotData)" />\n' +
                                '</template>\n' +
                                '<template v-slot:table-actions-bottom>\n' +
                                    '<div>{{pageInfo}}</div>\n' +
                                '</template>\n' +
                                '<template v-slot:emptystate>\n' +
                                    '<div>{{ i18n("common.table.no-data") }}</div>\n' +
                                '</template>\n' +
                                '<template v-slot:loadingContent>\n' +
                                    '<div></div>\n' +
                                '</template>\n' +
                        '</vue-good-table>\n' +
                    '</div>'
    }));

    Vue.component("cly-datatable-detail-toggler", countlyBaseComponent.extend({
        props: {
            scope: {
                type: Object
            }
        },
        template: '<div class="cly-vue-dt-detail-toggler">\n' +
                        '<div @click="scope.fns.setRowData(scope.props.row, {isDetailRowShown: !scope.props.row.isDetailRowShown})">\n' +
                            '<div v-if="!scope.props.row.isDetailRowShown">\n' +
                                '<i class="material-icons expand-row-icon">keyboard_arrow_down</i>\n' +
                            '</div>\n' +
                            '<div v-else>\n' +
                               '<i class="material-icons expand-row-icon">keyboard_arrow_up</i>\n' +
                            '</div>\n' +
                        '</div>\n' +
                   '</div>'
    }));

    Vue.component("cly-datatable-options", countlyBaseComponent.extend({
        props: {
            scope: {
                type: Object
            }
        },
        template: '<div class="cly-vue-dt-options">\n' +
                        '<span>\n' +
                            '<a class="cly-row-options-trigger" @click.stop="scope.fns.showRowOptions($event, scope.props.column.items, scope.props.row)"></a>\n' +
                        '</span>\n' +
                    '</div>'
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

    //

    var TabularDataManagerMixin = {
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
            }
        },
        computed: {
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
                }, 500)
            },
            'controlParams.page': function() {
                this.checkPageBoundaries();
            },
            lastPage: function() {
                this.checkPageBoundaries();
            }
        },
        data: function() {
            return {
                controlParams: this.getControlParams(),
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
                    sort: []
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
    //

    Vue.component("cly-datatable-n", countlyBaseComponent.extend({
        mixins: [
            _mixins.i18n,
            TabularDataManagerMixin,
            MutationTrackerMixin
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
                    unpatch: this.unpatch
                };
            }
        },
        template: '<div class="cly-vue-eldatatable" :class="classes">\
                        <div v-loading="isLoading" element-loading-background="rgb(255,255,255,0.3)">\
                            <div class="cly-vue-eldatatable__table-header">\
                                <div class="cly-vue-eldatatable__table-header-left">\
                                    <slot v-bind="commonScope" name="header-left"></slot>\
                                </div>\
                                <div class="cly-vue-eldatatable__table-header-right">\
                                    <slot v-bind="commonScope" name="header-right"></slot>\
                                    <el-input size="small" v-model="searchQueryProxy"></el-input>\
                                </div>\
                            </div>\
                            <el-table\
                                :row-key="keyFn"\
                                :data="mutatedRows"\
                                v-bind="$attrs"\
                                v-on="$listeners"\
                                @sort-change="onSortChange"\
                                ref="table">\
                                    <template v-for="(_, name) in forwardedSlots" v-slot:[name]="slotData">\
                                        <slot :name="name" v-bind="commonScope"/>\
                                    </template>\
                            </el-table>\
                            <div class="cly-vue-eldatatable__table-footer">\
                                <div class="cly-vue-eldatatable__table-footer-left">\
                                    <div class="cly-vue-eldatatable__table-page-size-selector">\
                                        {{ i18n("common.show-items") }}\
                                        <el-select v-model="controlParams.perPage" size="mini">\
                                            <el-option v-for="pageSize in availablePageSizes" :key="pageSize" :value="pageSize" :label="pageSize"></el-option>\
                                        </el-select>\
                                    </div>\
                                    {{ paginationInfo }}\
                                    <slot v-bind="commonScope" name="footer-left"></slot>\
                                </div>\
                                <div class="cly-vue-eldatatable__table-footer-right">\
                                    <slot v-bind="commonScope" name="footer-right"></slot>\
                                    <div class="cly-vue-eldatatable__table-page-selector">\
                                        <el-select v-model="controlParams.page" size="mini">\
                                            <el-option v-for="page in availablePages" :key="page" :value="page" :label="page"></el-option>\
                                        </el-select>\
                                    </div>\
                                    <div class="cly-vue-eldatatable__table-nav-arrows">\
                                        <span :class="{disabled: !prevAvailable}" @click="goToFirstPage"><i class="fa fa-angle-double-left"></i></span>\
                                        <span :class="{disabled: !prevAvailable}" @click="goToPrevPage"><i class="fa fa-angle-left"></i></span>\
                                        <span :class="{disabled: !nextAvailable}" @click="goToNextPage"><i class="fa fa-angle-right"></i></span>\
                                        <span :class="{disabled: !nextAvailable}" @click="goToLastPage"><i class="fa fa-angle-double-right"></i></span>\
                                    </div>\
                                </div>\
                            </div>\
                            <div class="cly-vue-eldatatable__table-bottomline">\
                                <slot name="bottomline" v-bind="commonScope"></slot>\
                            </div>\
                        </div>\
                    </div>'
    }));


}(window.countlyVue = window.countlyVue || {}, jQuery));
