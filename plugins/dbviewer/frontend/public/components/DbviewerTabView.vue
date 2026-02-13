<template>
<div class="dbviewer-tab">
    <cly-main>
        <div class="bu-columns">
            <div class="bu-column bu-is-one-third">
                <div class="dbviewer-tab__sidebar bg-white">
                    <div class="dbviewer-tab__app-selector-dropdown">
                        <cly-select-x
                            test-id="dbviewer-app-select"
                            @change="onAppChange($event)"
                            v-model="appFilter"
                            :options="apps">
                        </cly-select-x>
                    </div>
                    <cly-listbox
                        class="dbviewer-tab__collections-list"
                        test-id="collections-listbox"
                        skin="jumbo"
                        v-model="selectedCollection"
                        :searchable="true"
                        :options="preparedCollectionList"
                        @change="onCollectionChange"
                    >
                    </cly-listbox>
                </div>
            </div>
            <div class="bu-column">
                <div class="bu-level">
                    <div class="bu-level-left">
                        <div v-if="localDb" class="dbviewer-tab__content">
                            <div class="bu-has-text-weight-normal bu-is-size-5" data-test-id="collection-and-app-name-label">
                                <span v-if="index">{{ i18n('dbviewer.indexes-of') }} </span>{{ decodeHtml(collections[localDb].map[localCollection]) }}
                            </div>
                        </div>
                    </div>
                    <div class="bu-level-right">
                        <cly-more-options v-if="!isClickhouseDbSelected" class="bu-ml-2" @command="dbviewerActions($event)">
                            <el-dropdown-item command="aggregation">{{ i18n('dbviewer.aggregate') }}</el-dropdown-item>
                            <el-dropdown-item command="indexes">{{ i18n('dbviewer.indexes') }}</el-dropdown-item>
                            <el-dropdown-item command="data">{{ i18n('dbviewer.data') }}</el-dropdown-item>
                        </cly-more-options>
                    </div>
                </div>
                <cly-section class="dbviewer-tab__result-table bu-mt-3">
                    <cly-datatable-n row-key="_id" :expand-row-keys="expandKeys" :hide-top="false" :show-header="false" :data-source="remoteTableDataSource" :export-query="getExportQuery" @search-query-changed="setSearchQuery" @row-click="handleTableRowClick" ref="table" :row-class-name="tableRowClassName">
                        <template slot="header-left">
                            <el-button @click="toggleExpand()" data-test-id="collapse-or-expand-button">{{ isExpanded ? i18n('dbviewer.collapse-all') : i18n('dbviewer.expand-all') }}</el-button>
                            <el-button v-if="queryFilter" @click="removeFilters()" icon="fas fa-minus-square" data-test-id="remove-filters-button"> {{ i18n('dbviewer.remove-filters') }} </el-button>
                            <el-button @click="showFilterPopup()" icon="fas fa-filter" data-test-id="filter-button"> {{ i18n('dbviewer.filter') }}</el-button>
                        </template>
                        <template v-slot="scope">
                            <el-table-column fixed type="expand">
                                <template v-slot="rowScope">
                                    <pre>
                                        <code class="language-json hljs dbviewer-tab__code">{{ JSON.parse(rowScope.row._view) }}</code>
                                    </pre>
                                </template>
                            </el-table-column>
                            <el-table-column prop="_id" fixed>
                                <template v-slot="rowScope">
                                    <span v-if="!index">_id: {{ rowScope.row._id }}</span>
                                    <span v-if="index">{{ rowScope.row.name }}</span>
                                    <el-button @click="showDetailPopup(rowScope.row)" class="dbviewer-tab__expand-button" icon="fas fa-expand"></el-button>
                                </template>
                            </el-table-column>
                        </template>
                    </cly-datatable-n>
                </cly-section>
            </div>
        </div>
        <cly-form-dialog title="Filter Query"
            name="dbviewer-filter-query"
            @submit="onExecuteFilter"
            saveButtonLabel="Apply Filter"
            v-bind="formDialogs.queryFilter"
            ref="dbviewerFilterForm"
            >
            <template v-slot="formDialogScope">
                <div class="dbviewer-tab__popup-content">
                    <dbviewer-mongodb-filtering v-model="formDialogScope.editedObject.filter" />
                    <div class="dbviewer-tab__projection">
                        <el-checkbox
                            class="bu-mt-2"
                            v-model="formDialogScope.editedObject.projectionEnabled">
                                <span class="bu-has-text-weight-normal">{{ i18n('dbviewer.select-fields-to-return') }}</span>
                        </el-checkbox>
                        <div v-if="formDialogScope.editedObject.projectionEnabled">
                            <label
                                for="dbviewer-tab__projection-selector"
                                class="text-small bu-mt-2">
                                {{ i18n('dbviewer.projection') }}
                            </label>
                            <cly-select-x
                                :options="projectionOptions"
                                :placeholder="i18n('dbviewer.projection')"
                                :show-search="true"
                                :searchable="true"
                                v-model="formDialogScope.editedObject.projection"
                                class="bu-mt-1"
                                :hide-all-options-tab="true"
                                mode="multi-check"
                                :popper-append-to-body="false"
                                >
                                </cly-select-x>
                        </div>
                    </div>
                    <div class="dbviewer-tab__sort">
                        <el-checkbox
                            class="bu-mt-2"
                            v-model="formDialogScope.editedObject.sortEnabled">
                            <span class="bu-has-text-weight-normal"> {{ i18n('dbviewer.select-fields-to-sort') }}</span>
                        </el-checkbox>
                        <div v-if="formDialogScope.editedObject.sortEnabled">
                            <label
                                for="dbviewer-tab__sort-selector"
                                class="text-small bu-mt-2">
                                {{ i18n('dbviewer.sort-options') }}
                            </label>
                            <div class="dbviewer-tab__sort-inputs">
                                <cly-select-x
                                :options="projectionOptions"
                                :placeholder="i18n('dbviewer.sort-options')"
                                :show-search="true"
                                :searchable="true"
                                v-model="formDialogScope.editedObject.sort"
                                class="bu-mt-1"
                                :hide-all-options-tab="true"
                                :popper-append-to-body="false"
                                >
                                </cly-select-x>
                                <el-switch
                                    id="dbviewer-tab__sort-type-selector"
                                    v-model="isDescentSort"
                                    :active-text="i18n('dbviewer.descending')"
                                    :inactive-text="i18n('dbviewer.ascending')">
                                </el-switch>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <template slot="controls-left">
                <div @click="clearFilters()" class="text-medium color-danger bu-is-clickable">
                    Remove Filter
                </div>
            </template>
        </cly-form-dialog>
        <cly-form-dialog title="Filter Query"
            name="dbviewer-filter-query"
            @submit="onExecuteFilter"
            saveButtonLabel="Apply Filter"
            v-bind="formDialogs.clickhouseQueryFilter"
            ref="dbviewerChFilterForm"
            >
            <template v-slot="formDialogScope">
                <div class="dbviewer-tab__popup-content dbviewer-tab__popup-content--clickhouse">
                    <dbviewer-clickhouse-filtering
                        class="bu-mb-3"
                        v-model="formDialogScope.editedObject.filterObj"
                        @change="onFilterChange"
                        :fields="filterFields"
                        :disabled="isFetching"
                        :allow-delete-first-row="true"
                    />
                    <div class="dbviewer-tab__projection bu-mr-4">
                        <el-checkbox
                            class="bu-mt-2"
                            v-model="formDialogScope.editedObject.projectionEnabled">
                                <span class="bu-has-text-weight-normal">{{ i18n('dbviewer.select-fields-to-return') }}</span>
                        </el-checkbox>
                        <div v-if="formDialogScope.editedObject.projectionEnabled">
                            <label
                                for="dbviewer-tab__projection-selector"
                                class="text-small bu-mt-2">
                                {{ i18n('dbviewer.projection') }}
                            </label>
                            <cly-select-x
                                :options="projectionOptions"
                                :placeholder="i18n('dbviewer.projection')"
                                :show-search="true"
                                :searchable="true"
                                v-model="formDialogScope.editedObject.projection"
                                class="bu-mt-1"
                                :hide-all-options-tab="true"
                                mode="multi-check"
                                :popper-append-to-body="false"
                                >
                                </cly-select-x>
                        </div>
                    </div>
                    <!-- todo: Sorting for CH will be considered later -->
                    <!-- <div class="dbviewer-tab__sort">
                        <el-checkbox
                            class="bu-mt-2"
                            v-model="formDialogScope.editedObject.sortEnabled">
                            <span class="bu-has-text-weight-normal"> {{ i18n('dbviewer.select-fields-to-sort') }}</span>
                        </el-checkbox>
                        <div v-if="formDialogScope.editedObject.sortEnabled">
                            <label
                                for="dbviewer-tab__sort-selector"
                                class="text-small bu-mt-2">
                                {{ i18n('dbviewer.sort-options') }}
                            </label>
                            <div class="dbviewer-tab__sort-inputs">
                                <el-select
                                    :placeholder="i18n('dbviewer.sort-options')"
                                    :show-search="true"
                                    :searchable="true"
                                    v-model="formDialogScope.editedObject.sort"
                                    @focus="onClickhouseSortFocus"
                                    class="bu-mt-1"
                                    :hide-all-options-tab="true"
                                    :popper-append-to-body="false"
                                >
                                <el-option
                                    v-for="field in chSortOptions"
                                    :key="field.value"
                                    :label="field.label"
                                    :value="field.value"
                                />
                            </el-select>
                                <el-switch
                                    id="dbviewer-tab__sort-type-selector"
                                    v-model="isDescentSort"
                                    :active-text="i18n('dbviewer.descending')"
                                    :inactive-text="i18n('dbviewer.ascending')">
                                </el-switch>
                            </div>
                        </div>
                    </div> -->
                </div>
            </template>
            <template slot="controls-left">
                <div @click="clearFilters()" class="text-medium color-danger bu-is-clickable">
                    Remove Filter
                </div>
            </template>
        </cly-form-dialog>
        <cly-form-dialog
            class="dbviewer-tab__detail-dialog"
            :isOpened="showDetailDialog"
            name="dbviewer-document-detail"
            :title="index ? JSON.parse(rowDetail).name : JSON.parse(rowDetail)._id"
            saveButtonLabel="Close"
            ref="dbviewerDetailDialog"
            @submit="showDetailDialog = false"
            :hasCancelButton="false"
            >
            <template v-slot="formDialogScope">
                <pre>
                    <code class="language-json hljs dbviewer-tab__code-in-dialog">
                        {{ JSON.parse(rowDetail) }}
                    </code>
                </pre>
            </template>
        </cly-form-dialog>
    </cly-main>
</div>
</template>

<script>
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { hasFormDialogsMixin } from '../../../../../frontend/express/public/javascripts/components/dialog/mixins.js';
import { ServerDataTable, getServerDataSource, getLocalStore } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { app } from '../../../../../frontend/express/public/javascripts/countly/countly.template.js';
import DbviewerMongodbFiltering from './DbviewerMongodbFiltering.vue';
import DbviewerClickhouseFiltering from './DbviewerClickhouseFiltering.vue';
import store from 'storejs';
import ClyMain from '../../../../../frontend/express/public/javascripts/components/layout/cly-main.vue';
import ClySelectX from '../../../../../frontend/express/public/javascripts/components/input/select-x.vue';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClySection from '../../../../../frontend/express/public/javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../../../frontend/express/public/javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        "dbviewer-mongodb-filtering": DbviewerMongodbFiltering,
        "dbviewer-clickhouse-filtering": DbviewerClickhouseFiltering,
        ClyMain,
        ClySelectX,
        ClyMoreOptions,
        ClySection,
        ClyDatatableN
    },
    mixins: [
        hasFormDialogsMixin("queryFilter"),
        hasFormDialogsMixin("clickhouseQueryFilter"),
        i18nMixin
    ],
    props: {
        apps: {
            type: Array,
            default: function() { return []; }
        },
        collections: {
            type: Object,
            default: function() { return {}; }
        },
        tab: {
            type: String,
            default: "countly"
        },
        collection: {
            type: String
        },
        db: {
            type: String,
            default: "countly"
        },
        index: {
            type: Boolean,
            default: false
        }
    },
    data: function() {
        var self = this;
        var tableStore = getLocalStore(ServerDataTable("dbviewerTable", {
            columns: ['_id'],
            onRequest: function() {
                var queryObject = Object.assign({}, self.query);
                return {
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + self.dbviewerAPIEndpoint,
                    data: {
                        query: JSON.stringify(queryObject)
                    }
                };
            },
            onOverrideRequest: function(context, request) {
                request.data.skip = request.data.iDisplayStart;
                request.data.limit = request.data.iDisplayLength || (context.state && context.state.params && context.state.params.perPage) || 10;
                delete request.data.iDisplayLength;
                delete request.data.iDisplayStart;
            },
            onOverrideResponse: function(context, response) {
                response.aaData = response.collections;
                response.iTotalRecords = response.limit;
                response.iTotalDisplayRecords = response.total;
                if (!self.isRefresh) {
                    self.expandKeys = [];
                    self.expandKeysHolder = [];
                }
                for (var i = 0; i < response.aaData.length; i++) {
                    response.aaData[i]._view = JSON.stringify(response.aaData[i]);
                    if (self.index) {
                        response.aaData[i]._id = response.aaData[i].name;
                    }
                    if (!self.isRefresh) {
                        self.expandKeysHolder.push(response.aaData[i]._id);
                    }
                }
                self.expandKeys = self.expandKeysHolder;
            },
            onError: function(context, error) {
                if (error && error.status !== 0) {
                    self.isFetching = true; // do not refresh recursively
                    notify({
                        message: error.responseJSON && error.responseJSON.result ? error.responseJSON.result : i18n('dbviewer.server-error'),
                        type: "error"
                    });
                }
            },
            onReady: function(context, rows) {
                if (rows.length) {
                    var isCH = self.isClickhouseDbSelected === true;
                    var baseKeys = Object.keys(rows[0]).filter(function(k) {
                        return k !== "_view";
                    });
                    var sortedKeys = baseKeys.slice().sort();
                    var filterKeys = sortedKeys.filter(function(k) {
                        if (!isCH) {
                            return true;
                        }
                        var val = rows[0][k];
                        var isNestedField = val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
                        return !isNestedField;
                    });
                    self.projectionOptions = sortedKeys.map(function(item) {
                        return {
                            "label": item,
                            "value": item
                        };
                    });
                    self.filterFields = filterKeys.map(function(item) {
                        return {
                            "label": item,
                            "value": item
                        };
                    });
                }
                return rows;
            }
        }));
        return {
            tableStore: tableStore,
            remoteTableDataSource: getServerDataSource(tableStore, "dbviewerTable"),
            appFilter: "all",
            selectedCollection: null,
            collectionData: [],
            queryFilter: null,
            projectionEnabled: false,
            sortEnabled: false,
            projection: [],
            sort: "",
            localCollection: this.collection,
            localDb: this.db,
            projectionOptions: {},
            isDescentSort: false,
            isIndexRequest: false,
            searchQuery: "",
            isExpanded: true,
            expandKeys: [],
            expandKeysHolder: [],
            isRefresh: false,
            isLoading: false,
            isFetching: false,
            showFilterDialog: false,
            showDetailDialog: false,
            rowDetail: '{ "_id":"Document Detail", "name": "Index Detail" }',
            filterFields: [],
            chSortOptions: [],
            queryFilterObj: { rows: [] }
        };
    },
    watch: {
        selectedCollection: function(newVal) {
            if (!this.$route || !this.$route.params || !this.$route.params.query) {
                this.localCollection = newVal;
                this.queryFilter = null;
                this.projectionEnabled = false;
                this.projection = [];
                this.sortEnabled = false;
                this.sort = "";
                if (this.index) {
                    app.navigate("#/manage/db/indexes/" + this.localDb + "/" + newVal, false);
                }
                else {
                    app.navigate("#/manage/db/" + this.localDb + "/" + newVal, false);
                }
                this.tableStore.dispatch("fetchDbviewerTable", {_silent: false});
                store.set('dbviewer_app_filter', this.appFilter);
            }
            else {
                this.localCollection = newVal;
                if (this.index) {
                    app.navigate("#/manage/db/indexes/" + this.localDb + "/" + newVal + "/" + this.$route.params.query, false);
                }
                else {
                    app.navigate("#/manage/db/" + this.localDb + "/" + newVal + "/" + this.$route.params.query, false);
                }
                this.tableStore.dispatch("fetchDbviewerTable", {_silent: false});
                store.set('dbviewer_app_filter', this.appFilter);
            }
        }
    },
    methods: {
        onAppChange: function(val) {
            if (val !== "all") {
                this.appFilter = countlyGlobal.apps[val].label;
            }
        },
        toggleExpand: function() {
            this.isExpanded = !this.isExpanded;
            if (this.isExpanded) {
                this.expandKeys = this.expandKeysHolder;
            }
            else {
                this.expandKeys = [];
            }
        },
        setSearchQuery: function(query) {
            this.searchQuery = query;
        },
        dbviewerActions: function(command) {
            switch (command) {
            case 'aggregation':
                window.location.hash = "#/manage/db/aggregate/" + this.localDb + "/" + this.localCollection;
                break;
            case 'indexes':
                if (this.isClickhouseDbSelected) {
                    return;
                }
                window.location.hash = "#/manage/db/indexes/" + this.localDb + "/" + this.localCollection;
                break;
            case 'data':
                window.location.hash = "#/manage/db/" + this.localDb + "/" + this.localCollection;
                break;
            }
        },
        onFilterChange: function(payload) {
            this.chSortOptions = this.buildClickhouseSortOptions(payload);
        },
        buildClickhouseSortOptions: function(fObj) {
            var rows = Array.isArray(fObj && fObj.rows) ? fObj.rows : [];
            var ops = {};
            rows.forEach(function(r) {
                if (!r || !r.field) {
                    return;
                }
                var f = String(r.field);
                var o = (r.operator || '').toUpperCase();
                ops[f] = ops[f] || [];
                ops[f].push(o);
            });

            var aHasAny = ops.a && ops.a.length;
            var aHasEq = aHasAny && ops.a.some(function(o) {
                return o === '=';
            }) && !ops.a.some(function(o) {
                return o !== '=';
            });
            var aHasNonEq = aHasAny && ops.a.some(function(o) {
                return o !== '=';
            });

            var eHasAny = ops.e && ops.e.length;
            var eHasEq = eHasAny && ops.e.some(function(o) {
                return o === '=';
            }) && !ops.e.some(function(o) {
                return o !== '=';
            });
            var eHasNonEq = eHasAny && ops.e.some(function(o) {
                return o !== '=';
            });

            var nHasAny = ops.n && ops.n.length;
            var nHasEq = nHasAny && ops.n.some(function(o) {
                return o === '=';
            }) && !ops.n.some(function(o) {
                return o !== '=';
            });
            var nHasNonEq = nHasAny && ops.n.some(function(o) {
                return o !== '=';
            });

            var aVisible = true;
            var eVisible = aHasEq && !aHasNonEq;
            var nVisible = eVisible && eHasEq && !eHasNonEq;
            var tsVisible = eVisible && eHasEq && !eHasNonEq && (!nHasAny || (nHasEq && !nHasNonEq));

            var opts = [];
            if (aVisible) {
                opts.push({ label: 'a', value: 'a' });
            }
            if (eVisible) {
                opts.push({ label: 'e', value: 'e' });
            }
            if (nVisible) {
                opts.push({ label: 'n', value: 'n' });
            }
            if (tsVisible) {
                opts.push({ label: 'ts', value: 'ts' });
            }
            return opts;
        },
        showFilterPopup: function(options) {
            var isCH = this.isClickhouseDbSelected === true;
            var mongoFilter = this.queryFilter || "";
            var chFilterModel = (this.queryFilterObj && typeof this.queryFilterObj === "object")
                ? this.queryFilterObj
                : { rows: [] };
            var hasRows = Array.isArray(chFilterModel.rows) && chFilterModel.rows.length > 0;
            var chFilter = (!isCH && !hasRows && mongoFilter) ? { rows: [] } : chFilterModel;

            var payload = Object.assign({
                filter: mongoFilter,
                filterObj: chFilter,
                projectionEnabled: !!this.projectionEnabled,
                projection: this.projection || [],
                fields: this.projection || [],
                sortEnabled: !!this.sortEnabled,
                sort: this.sort || ""
            }, options);

            if (isCH) {
                this.chSortOptions = this.buildClickhouseSortOptions(chFilter);
            }

            var dialogId = isCH ? "clickhouseQueryFilter" : "queryFilter";
            this.openFormDialog(dialogId, payload);
        },
        showDetailPopup: function(row) {
            this.showDetailDialog = true;
            this.rowDetail = row._view;
        },
        onExecuteFilter: function(formData) {
            this.sort = formData.sort;
            this.projection = formData.projection;
            this.sortEnabled = formData.sortEnabled;
            this.projectionEnabled = formData.projectionEnabled;
            if (this.isClickhouseDbSelected) {
                var chRows = (formData.filterObj && Array.isArray(formData.filterObj.rows)) ? formData.filterObj.rows : [];
                var sanitizedRows = chRows.filter(function(r) {
                    return r && r.field && r.operator;
                });
                this.queryFilterObj = sanitizedRows.length ? { rows: sanitizedRows } : { rows: [] };
                if (sanitizedRows.length) {
                    this.queryFilter = JSON.stringify(this.queryFilterObj);
                }
                else {
                    this.queryFilterObj = { rows: [] };
                    this.queryFilter = null;
                }
            }
            else {
                this.queryFilter = formData.filter || null;
                this.queryFilterObj = { rows: [] };
            }

            var queryObj = {
                filter: this.queryFilter,
                projection: this.projection,
                sort: this.sort,
                projectionEnabled: this.projectionEnabled,
                sortEnabled: this.sortEnabled,
                isDescentSort: this.isDescentSort
            };

            if (this.isClickhouseDbSelected && this.queryFilterObj && this.queryFilterObj.rows && this.queryFilterObj.rows.length > 0) {
                queryObj.filterObj = this.queryFilterObj;
            }

            this.updatePath(queryObj);
            this.fetch(true);
        },
        removeFilters: function() {
            this.queryFilter = null;
            this.projectionEnabled = false;
            this.projection = [];
            this.sortEnabled = false;
            this.sort = "";
            this.queryFilterObj = { rows: [] };
            app.navigate("#/manage/db/" + this.localDb + "/" + this.selectedCollection);
            this.fetch(true);
        },
        getActiveFilterFormRef: function() {
            return this.isClickhouseDbSelected ? this.$refs.dbviewerChFilterForm : this.$refs.dbviewerFilterForm;
        },
        clearFilters: function() {
            var blank = {
                filter: null,
                filterObj: { rows: [] },
                projectionEnabled: false,
                projection: [],
                sortEnabled: false,
                sort: ""
            };
            this.isDescentSort = false;
            var activeForm = this.getActiveFilterFormRef();
            if (activeForm && activeForm.editedObject) {
                Object.assign(activeForm.editedObject, blank);
            }
        },
        fetch: function(force) {
            this.isRefresh = false;
            var self = this;
            if (force) {
                this.isLoading = true;
            }
            if (force || !this.isFetching) {
                this.isFetching = true;
                this.tableStore.dispatch("fetchDbviewerTable", {_silent: !force}).then(function() {
                    self.isLoading = false;
                    self.isFetching = false;
                });
            }
        },
        getExportQuery: function() {
            var sort = "";
            if (this.sortEnabled) {
                sort = JSON.stringify(this.preparedSortObject);
            }
            var apiQueryData = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                projection: JSON.stringify(this.preparedProjectionFields),
                query: this.queryFilter,
                sort: sort,
                collection: this.localCollection,
                db: this.localDb,
                url: "/o/export/db",
                get_index: this.index,
                api_key: countlyGlobal.member.api_key
            };
            return apiQueryData;
        },
        refresh: function(force) {
            var isAnyFilterOpen = (this.formDialogs && ((this.formDialogs.queryFilter && this.formDialogs.queryFilter.isOpened) || (this.formDialogs.clickhouseQueryFilter && this.formDialogs.clickhouseQueryFilter.isOpened)));
            if (isAnyFilterOpen) {
                return;
            }
            this.isRefresh = true;
            this.fetch(force);
            this.isExpanded = true;
        },
        handleTableRowClick: function(row, _col, event) {
            var noTextSelected = window.getSelection().toString().length === 0;
            var targetIsOK = !event.target.closest('button');

            if (noTextSelected && targetIsOK) {
                this.$refs.table.$refs.elTable.toggleRowExpansion(row);
            }
        },
        tableRowClassName: function() {
            return 'bu-is-clickable';
        },
        updatePath: function(query) {
            if (this.localCollection && this.localDb) {
                window.location.hash = "#/manage/db/" + this.localDb + "/" + this.localCollection + "/" + JSON.stringify(query);
                if (this.index) {
                    window.location.hash = "#/manage/db/indexes/" + this.localDb + "/" + this.localCollection + "/" + JSON.stringify(query);
                }
            }
        },
        onCollectionChange: function() {
            if (this.$route && this.$route.params && this.$route.params.query) {
                delete this.$route.params.query;
            }
        },
        decodeHtml: function(str) {
            return countlyCommon.unescapeHtml(str);
        },
    },
    computed: {
        dbviewerAPIEndpoint: function() {
            var url = '/db?app_id=' + countlyCommon.ACTIVE_APP_ID + '&dbs=' + this.localDb + '&collection=' + this.localCollection;
            if (this.queryFilter) {
                url += '&filter=' + encodeURIComponent(this.queryFilter);
            }
            if (this.projectionEnabled) {
                url += '&projection=' + JSON.stringify(this.preparedProjectionFields);
            }
            if (this.sortEnabled) {
                url += '&sort=' + JSON.stringify(this.preparedSortObject);
            }
            if (this.index) {
                url += '&action=get_indexes';
            }
            return url;
        },
        preparedCollectionList: function() {
            var self = this;
            return this.collections[this.localDb].list.filter(function(collection) {
                if (self.appFilter !== "all") {
                    return collection.label.indexOf(self.appFilter) > -1;
                }
                else {
                    return collection;
                }
            });
        },
        preparedProjectionFields: function() {
            var ob = {};
            if (this.projection && Array.isArray(this.projection)) {
                for (var i = 0; i < this.projection.length; i++) {
                    ob[this.projection[i]] = 1;
                }
            }
            return ob;
        },
        preparedSortObject: function() {
            var ob = {};
            if (this.sort) {
                ob[this.sort] = this.isDescentSort ? -1 : 1;
            }
            return ob;
        },
        isClickhouseActive: function() {
            return countlyGlobal.plugins.indexOf("clickhouse") !== -1;
        },
        isClickhouseDbSelected: function() {
            return this.db && this.db.startsWith("clickhouse");
        }
    },
    created: function() {
        this.isRefresh = false;
        var routeHashItems = window.location.hash.split("/");
        if (routeHashItems.length === 6) {
            this.localCollection = routeHashItems[5];
            this.selectedCollection = this.localCollection;
            if (store.get('dbviewer_app_filter')) {
                this.appFilter = store.get('dbviewer_app_filter');
            }
            else {
                this.appFilter = "all";
            }
            this.localDb = routeHashItems[4];
        }

        if (!this.localDb) {
            this.localDb = 'countly';
        }
        if (this.$route.params && this.$route.params.query && JSON.parse(this.$route.params.query)) {
            var parsedQuery = JSON.parse(this.$route.params.query);
            this.queryFilter = parsedQuery.filter;
            this.sort = parsedQuery.sort;
            this.projection = parsedQuery.projection;
            this.projectionEnabled = parsedQuery.projectionEnabled;
            this.sortEnabled = parsedQuery.sortEnabled;
            this.isDescentSort = parsedQuery.isDescentSort;

            if (this.isClickhouseDbSelected) {
                this.queryFilterObj = parsedQuery.filterObj || { rows: [] };
            }
            else {
                this.queryFilterObj = { rows: [] };
            }
        }

        if (!this.localCollection) {
            if (this.collections[this.localDb].list.length) {
                this.localCollection = this.collections[this.localDb].list[0].value;
                this.selectedCollection = this.localCollection;
                window.location = '#/manage/db/' + this.localDb + '/' + this.collections[this.localDb].list[0].value;
            }
        }
        for (var collectionKey in this.collections) {
            if (Object.prototype.hasOwnProperty.call(this.collections, collectionKey)) {
                var collection = this.collections[collectionKey];
                for (var i = 0; i < collection.list.length; i++) {
                    var listItem = collection.list[i];
                    listItem.label = countlyCommon.unescapeHtml(listItem.label);
                }
            }
        }
    }
};
</script>
