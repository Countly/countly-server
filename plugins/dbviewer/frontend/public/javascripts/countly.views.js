/*global countlyGlobal, store, hljs, countlyDBviewer, app, countlyCommon, CV, countlyVue, CountlyHelpers, _, countlyAuth, Vue*/

(function() {

    var FEATURE_NAME = 'dbviewer';
    if (countlyAuth.validateRead(FEATURE_NAME)) {
        // Helper UI Components
        Vue.component("cly-dbviewer-mongodb-filtering", countlyVue.views.create({
            template: countlyVue.T("/dbviewer/templates/filtering/dbviewer-mongodb-filtering.html"),
            props: {
                value: { type: [String, Object], default: '' }
            }
        }));

        var DbviewerFilterRow = countlyVue.views.BaseView.extend({
            template: '#cly-dbviewer-filter-row',
            props: {
                allowDeleteFirstRow: { type: Boolean, default: false },
                disabled: { type: Boolean, default: false },
                fields: { type: Array, required: true },
                isFirstRow: { type: Boolean, default: false },
                isLastRow: { type: Boolean, default: false },
                row: { type: Object, required: true }
            },
            data() {
                return {
                    suppressEmit: false,
                    local: {
                        field: this.row.field || '',
                        operator: this.row.operator || '',
                        value: this.row.value || '',
                        conjunction: this.row.conjunction || 'AND'
                    },
                    defaultOperators: [
                        { label: '=', value: '=' },
                        { label: '!=', value: '!=' },
                        { label: '>', value: '>' },
                        { label: '>=', value: '>=' },
                        { label: '<', value: '<' },
                        { label: '<=', value: '<=' },
                        // todo: We might enable below operators later on
                        // { label: 'IN', value: 'IN' },
                        // { label: 'NOT IN', value: 'NOT IN' },
                        // { label: 'LIKE', value: 'LIKE' },
                        // { label: 'IS NULL', value: 'IS NULL' },
                        // { label: 'IS NOT NULL', value: 'IS NOT NULL' }
                    ]
                };
            },
            computed: {
                showConjunction() {
                    return !this.isFirstRow;
                },
                needsValue() {
                    return this.local.operator;
                }
            },
            watch: {
                row: {
                    deep: true,
                    handler(r) {
                        this.suppressEmit = true;
                        this.local.field = r.field || '';
                        this.local.operator = r.operator || '';
                        this.local.value = r.value || '';
                        this.local.conjunction = r.conjunction || 'AND';
                        this.$nextTick(() => {
                            this.suppressEmit = false;
                        });
                    }
                }
            },
            methods: {
                emitPatch() {
                    if (this.suppressEmit) {
                        return;
                    }
                    this.$emit('update-row', { id: this.row.id, ...this.local });
                },
                onFieldChange() {
                    this.local.operator = '';
                    this.local.value = '';
                    this.emitPatch();
                },
                onValueChange() {
                    this.emitPatch();
                },
                onOperatorChange() {
                    if (!this.needsValue) {
                        this.local.value = '';
                    }
                    this.emitPatch();
                },
                onValueInput(val) {
                    this.local.value = val;
                    this.emitPatch();
                },
                onConjunctionChange(val) {
                    this.local.conjunction = val;
                    this.emitPatch();
                },
                deleteRow() {
                    this.$emit('delete-row', this.row.id);
                }
            }
        });

        var DbViewerClickhouseFiltering = countlyVue.views.BaseView.extend({
            template: '#dbviewer-clickhouse-filtering',
            components: { 'cly-dbviewer-filter-row': DbviewerFilterRow },
            props: {
                value: { type: Object, default: () => ({ rows: [] }) },
                fields: { type: Array, required: true },
                disabled: { type: Boolean, default: false },
                allowDeleteFirstRow: { type: Boolean, default: true }
            },
            data() {
                return {
                    rows: [],
                    isEmitting: false,

                    // To-do: vue-scroll will be added later and below state will be used for it
                    // scrollOps: {
                    //     vuescroll: {},
                    //     scrollPanel: { initialScrollX: false },
                    //     rail: { gutterOfSide: '1px', gutterOfEnds: '15px' },
                    //     bar: { background: '#A7AEB8', size: '6px', specifyBorderRadius: '3px', keepShow: false }
                    // }
                };
            },
            created() {
                this.syncFromValue(this.value);
            },
            watch: {
                value(v) {
                    if (this.isEmitting) {
                        return;
                    }
                    this.syncFromValue(v);
                }
            },
            methods: {
                syncFromValue(v) {
                    const arr = Array.isArray(v && v.rows) ? v.rows : [];
                    this.rows = arr.length ? arr.map(r => ({
                        id: r.id || Date.now() + Math.random(),
                        field: r.field || '',
                        operator: r.operator || '',
                        value: r.value || '',
                        conjunction: r.conjunction || 'AND'
                    })) : [this.makeEmptyRow()];
                },
                emitModelChange() {
                    const payload = {
                        rows: this.rows
                    };
                    this.isEmitting = true;
                    this.$emit('input', payload);
                    this.$emit('change', payload);
                    this.$nextTick(() => {
                        this.isEmitting = false;
                    });
                },
                addRow() {
                    this.rows.push(this.makeEmptyRow());
                    this.emitModelChange();
                },
                onDeleteRow(id) {
                    const i = this.rows.findIndex(r => r.id === id);
                    if (i > -1) {
                        this.rows.splice(i, 1);
                    }
                    if (!this.rows.length) {
                        this.rows.push(this.makeEmptyRow());
                    }
                    this.emitModelChange();
                },
                onUpdateRow(patch) {
                    const i = this.rows.findIndex(r => r.id === patch.id);
                    if (i === -1) {
                        return;
                    }

                    const prev = this.rows[i];
                    const next = {
                        ...prev,
                        ...patch
                    };
                    if (
                        prev.field === next.field &&
                        prev.operator === next.operator &&
                        prev.value === next.value &&
                        prev.conjunction === next.conjunction
                    ) {
                        return;
                    }
                    this.$set(this.rows, i, next);
                    this.emitModelChange();
                },
                makeEmptyRow() {
                    return {
                        id: Date.now() + Math.random(),
                        field: '',
                        operator: '',
                        value: '',
                        conjunction: 'AND'
                    };
                }
            }
        });

        // View definitions
        var DBViewerTab = countlyVue.views.create({
            template: CV.T("/dbviewer/templates/tab.html"),
            components: {
                "dbviewer-clickhouse-filtering": DbViewerClickhouseFiltering
            },
            mixins: [
                countlyVue.mixins.hasFormDialogs("queryFilter"),
                countlyVue.mixins.hasFormDialogs("clickhouseQueryFilter"),
            ],
            props: {
                apps: {
                    type: Array,
                    default: []
                },
                collections: {
                    type: Object,
                    default: {}
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
                var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("dbviewerTable", {
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
                        request.data.limit = request.data.iDisplayLength || context.state?.params?.perPage || 10;
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
                            CountlyHelpers.notify({
                                message: error.responseJSON && error.responseJSON.result ? error.responseJSON.result : CV.i18n('dbviewer.server-error'),
                                type: "error"
                            });
                        }
                    },
                    onReady: function(context, rows) {
                        if (rows.length) {
                            var keys = Object.keys(rows[0]).filter(function(k) {
                                return k !== "_view";
                            });
                            self.projectionOptions = keys.sort().map(function(item) {
                                return {
                                    "label": item,
                                    "value": item
                                };
                            });
                            self.filterFields = self.projectionOptions.map(function(item) {
                                return {
                                    "label": item.label,
                                    "value": item.value
                                };
                            });
                        }
                        return rows;
                    }
                }));
                return {
                    tableStore: tableStore,
                    remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "dbviewerTable"),
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
                        // ClickHouse does not support Mongo-like indexes in DBViewer
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
                    // recreate sort options
                    this.chSortOptions = this.buildClickhouseSortOptions(payload);
                },
                buildClickhouseSortOptions: function(fObj) {
                    // big to-do: below rules only valid for the tables which has a,e,n,ts sorting keys
                    //            backend is fully compatible with possible new collections for different sort keys though.
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

                    // Visibility rules:
                    // a: always visible
                    // e: visible only if a is '=' 
                    // n: visible only if a and e are '=' 
                    // ts: visible if a and e are '=' (and if n exists then n must be '=' too)
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

                    var payload = _.extend({
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
                    // fields
                    this.sort = formData.sort;
                    this.projection = formData.projection;
                    // enabled states
                    this.sortEnabled = formData.sortEnabled;
                    this.projectionEnabled = formData.projectionEnabled;
                    // query
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
                        api_key: countlyGlobal.member.api_key,
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        //filename: "DBViewer" + moment().format("DD-MMM-YYYY"), - using passed filename from form
                        projection: JSON.stringify(this.preparedProjectionFields),
                        query: this.queryFilter,
                        sort: sort,
                        collection: this.localCollection,
                        db: this.localDb,
                        url: "/o/export/db",
                        get_index: this.index
                    };
                    return apiQueryData;
                },
                refresh: function(force) {
                    this.isRefresh = true;
                    this.fetch(force);
                    this.isExpanded = true;
                },
                highlight: function(content) {
                    return hljs.highlightAuto(content).value;
                },
                handleTableRowClick: function(row, _col, event) {
                    // Only expand row if text inside of it are not highlighted
                    var noTextSelected = window.getSelection().toString().length === 0;
                    // Elements like button or input field should not expand row when clicked
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
                    var url = '/db?api_key=' + countlyGlobal.member.api_key + '&app_id=' + countlyCommon.ACTIVE_APP_ID + '&dbs=' + this.localDb + '&collection=' + this.localCollection;
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

                    // Load filterObj for ClickHouse from URL
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
        });

        var DBViewerMain = countlyVue.views.create({
            template: CV.T("/dbviewer/templates/main.html"),
            data: function() {
                return {
                    dynamicTab: (this.$route.params && this.$route.params.db) || "countly",
                    db: (this.$route.params && this.$route.params.db) || null,
                    collection: (this.$route.params && this.$route.params.collection) || null,
                    tabs: [],
                    apps: [],
                    collections: {},
                    index: (this.$route.params && this.$route.params.index) || null,
                };
            },
            methods: {
                prepareTabs: function(dbs) {
                    for (var i = 0; i < dbs.length; i++) {
                        this.tabs.push({
                            title: this.formatDBName(dbs[i].name),
                            name: dbs[i].name,
                            component: DBViewerTab,
                            route: '#/' + countlyCommon.ACTIVE_APP_ID + '/manage/db/' + dbs[i].name
                        });
                    }
                },
                prepareCollectionList: function(dbs) {
                    for (var i = 0; i < dbs.length; i++) {
                        this.collections[dbs[i].name] = {
                            list: [],
                            map: {}
                        };
                        for (var j = 0; j < dbs[i].list.length; j++) {
                            this.collections[dbs[i].name].list.push({
                                value: dbs[i].collections[dbs[i].list[j]],
                                label: dbs[i].list[j]
                            });
                            this.collections[dbs[i].name].map[dbs[i].collections[dbs[i].list[j]]] = dbs[i].list[j];
                        }
                    }
                },
                formatDBName: function(name) {
                    var parts = name.split("_");

                    for (var i = 0; i < parts.length; i++) {
                        if (parts[i] === "fs") {
                            parts[i] = "File System";
                        }
                        else {
                            parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
                        }
                    }

                    return parts.join(" ") + " Database";
                },
                prepareApps: function() {
                    var apps = countlyGlobal.apps || {};
                    var appKeys = Object.keys(apps);
                    var formattedApps = [];

                    for (var i = 0; i < appKeys.length; i++) {
                        formattedApps.push({
                            label: apps[appKeys[i]].name,
                            value: apps[appKeys[i]]._id
                        });
                    }

                    formattedApps.sort(function(a, b) {
                        const aLabel = a?.label || '';
                        const bLabel = b?.label || '';
                        const locale = countlyCommon.BROWSER_LANG || 'en';

                        if (aLabel && bLabel) {
                            return aLabel.localeCompare(bLabel, locale, { numeric: true }) || 0;
                        }

                        // Move items with no label to the end
                        if (!aLabel && bLabel) {
                            return 1;
                        }

                        if (aLabel && !bLabel) {
                            return -1;
                        }

                        return 0;
                    });

                    formattedApps.unshift({
                        label: 'All Apps',
                        value: 'all'
                    });

                    this.apps = formattedApps;
                }
            },
            created: function() {
                var self = this;
                var dbs = countlyDBviewer.getData();

                if (!dbs.length) {
                    countlyDBviewer.initialize()
                        .then(function() {
                            dbs = countlyDBviewer.getData();
                            self.prepareTabs(dbs);
                            self.prepareCollectionList(dbs);
                        });
                }
                else {
                    this.prepareTabs(dbs);
                    this.prepareCollectionList(dbs);
                }

                this.prepareApps();
            }
        });

        var DBViewerAggregate = countlyVue.views.create({
            template: CV.T("/dbviewer/templates/aggregate.html"),
            data: function() {
                return {
                    query: '',
                    db: (this.$route.params && this.$route.params.db),
                    collection: (this.$route.params && this.$route.params.collection),
                    aggregationResult: [{'_id': 'query_not_executed_yet'}],
                    queryLoading: false,
                    fields: [],
                    collectionName: (this.$route.params && this.$route.params.collection),
                };
            },
            methods: {
                backToDBViewer: function() {
                    window.location = '#/manage/db/' + this.db + '/' + this.collection;
                },
                decodeHtml: function(str) {
                    return countlyCommon.unescapeHtml(str);
                },
                executeQuery: function() {
                    var self = this;

                    try {
                        var query = JSON.stringify(JSON.parse(this.query));
                        this.queryLoading = true;
                        countlyDBviewer.executeAggregation(this.db, this.collection, query, countlyGlobal.ACTIVE_APP_ID, null, function(err, res) {
                            self.updatePath(self.query);
                            if (res) {
                                var map = [];
                                res.aaData.forEach(row => {
                                    Object.keys(row).forEach(key => {
                                        map[key] = true;
                                    });
                                });
                                self.aggregationResult = res.aaData;
                                if (res.aaData.length) {
                                    self.fields = Object.keys(map);
                                }
                                if (res.removed && typeof res.removed === 'object' && Object.keys(res.removed).length > 0) {
                                    self.removed = CV.i18n('dbviewer.removed-warning') + Object.keys(res.removed).join(", ");

                                }
                                else {
                                    self.removed = "";
                                }
                            }
                            if (err) {
                                var message = CV.i18n('dbviewer.server-error');
                                if (err.responseJSON && err.responseJSON.result && typeof err.responseJSON.result === "string") {
                                    message = err.responseJSON.result;
                                }
                                CountlyHelpers.notify({
                                    message,
                                    type: "error",
                                    sticky: false,
                                    clearAll: true
                                });
                            }
                            self.queryLoading = false;
                        });
                    }
                    catch (err) {
                        CountlyHelpers.notify({
                            message: CV.i18n('dbviewer.invalid-pipeline'),
                            type: "error"
                        });
                        self.queryLoading = false;
                    }
                },
                updatePath: function(query) {
                    app.navigate("#/manage/db/aggregate/" + this.db + "/" + this.collection + "/" + query);
                },
                getCollectionName: function() {
                    var self = this;
                    if (this.db && this.collection) {
                        var dbs = countlyDBviewer.getData();
                        if (dbs.length) {
                            this.collectionName = countlyDBviewer.getName(this.db, this.collection);
                        }
                        else {
                            countlyDBviewer.initialize()
                                .then(function() {
                                    self.collectionName = countlyDBviewer.getName(self.db, self.collection);
                                });
                        }
                    }
                }
            },
            created: function() {
                if (this.$route && this.$route.params && this.$route.params.query) {
                    this.query = this.$route.params.query;
                    this.executeQuery();
                }
                if (!(this.$route && this.$route.params && this.$route.params.collection) || !(this.$route.params && this.$route.params.db)) {
                    window.location = '#/manage/db';
                }
                this.getCollectionName();
            }
        });

        var DBViewerMainView = new countlyVue.views.BackboneWrapper({
            component: DBViewerMain,
            templates: countlyGlobal.plugins.indexOf("clickhouse") !== -1
                ? ["/dbviewer/templates/filtering/dbviewer-clickhouse-filtering.html"]
                : []
        });

        var DBViewerAggregateView = new countlyVue.views.BackboneWrapper({
            component: DBViewerAggregate
        });

        app.route('/manage/db', 'dbs', function() {
            this.renderWhenReady(DBViewerMainView);
        });

        app.route('/manage/db/:db', 'dbs', function(db) {
            DBViewerMainView.params = {
                db: db
            };
            this.renderWhenReady(DBViewerMainView);
        });

        app.route('/manage/db/:db/:collection/*query', 'dbs', function(db, collection, query) {
            DBViewerMainView.params = {
                db: db,
                collection: collection,
                query: query
            };
            this.renderWhenReady(DBViewerMainView);
        });

        app.route('/manage/db/:db/:collection', 'dbs', function(db, collection) {
            DBViewerMainView.params = {
                db: db,
                collection: collection
            };
            this.renderWhenReady(DBViewerMainView);
        });

        app.route('/manage/db/indexes/:db/:collection', 'dbs', function(db, collection) {
            DBViewerMainView.params = {
                db: db,
                collection: collection,
                index: true
            };
            this.renderWhenReady(DBViewerMainView);
        });

        app.route('/manage/db/indexes/:db/:collection/*query', 'dbs', function(db, collection, query) {
            DBViewerMainView.params = {
                db: db,
                collection: collection,
                index: true,
                query: query
            };
            this.renderWhenReady(DBViewerMainView);
        });

        app.route('/manage/db/aggregate/:db/:collection', 'dbs', function(db, collection) {
            DBViewerAggregateView.params = {
                db: db,
                collection: collection
            };
            this.renderWhenReady(DBViewerAggregateView);
        });

        app.route('/manage/db/aggregate/:db/:collection/*query', 'dbs', function(db, collection, query) {
            DBViewerAggregateView.params = {
                db: db,
                collection: collection,
                query: query
            };
            this.renderWhenReady(DBViewerAggregateView);
        });

        app.addMenu("management", {code: "db", permission: FEATURE_NAME, url: "#/manage/db", text: "dbviewer.title", priority: 120});
    }
})();
