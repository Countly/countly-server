/*global countlyGlobal, store, hljs, countlyDBviewer, app, countlyCommon, CV, countlyVue, CountlyHelpers, _, countlyAuth*/

(function() {

    var FEATURE_NAME = 'dbviewer';
    if (countlyAuth.validateRead(FEATURE_NAME)) {
        var DBViewerTab = countlyVue.views.create({
            template: CV.T("/dbviewer/templates/tab.html"),
            mixins: [
                countlyVue.mixins.hasFormDialogs("queryFilter")
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
                        request.data.limit = request.data.iDisplayLength;
                        delete request.data.iDisplayLength;
                        delete request.data.iDisplayStart;
                    },
                    onOverrideResponse: function(context, response) {
                        response.aaData = response.collections;
                        response.iTotalRecords = response.limit;
                        response.iTotalDisplayRecords = response.total;
                        if (!self.refresh) {
                            self.expandKeys = [];
                            self.expandKeysHolder = [];
                        }
                        for (var i = 0; i < response.aaData.length; i++) {
                            response.aaData[i]._view = JSON.stringify(response.aaData[i]);
                            if (!self.refresh) {
                                self.expandKeysHolder.push(response.aaData[i]._id);
                            }
                        }
                        self.expandKeys = self.expandKeysHolder;
                    },
                    onError: function(context, error) {
                        if (error && error.status !== 0) {
                            CountlyHelpers.notify({
                                message: error.statusText || CV.i18n('dbviewer.server-error'),
                                type: "error"
                            });
                        }
                    },
                    onReady: function(context, rows) {
                        if (rows.length) {
                            self.projectionOptions = Object.keys(rows[0]);
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
                    projectionOptions: [],
                    isDescentSort: false,
                    isIndexRequest: false,
                    searchQuery: "",
                    isExpanded: true,
                    expandKeys: [],
                    expandKeysHolder: [],
                    isRefresh: false,
                    showFilterDialog: false,
                    showDetailDialog: false,
                    rowDetail: '{ "_id":"Document Detail", "name": "Index Detail" }'
                };
            },
            watch: {
                selectedCollection: function(newVal) {
                    if (!this.$route || !this.$route.params || !this.$route.params.query) {
                        this.collection = newVal;
                        this.queryFilter = null;
                        this.projectionEnabled = false;
                        this.projection = [];
                        this.sortEnabled = false;
                        this.sort = "";
                        app.navigate("#/manage/db/" + this.db + "/" + newVal, false);
                        this.tableStore.dispatch("fetchDbviewerTable");
                        store.set('dbviewer_app_filter', this.appFilter);
                    }
                    else {
                        this.collection = newVal;
                        app.navigate("#/manage/db/" + this.db + "/" + newVal + "/" + this.$route.params.query, false);
                        this.tableStore.dispatch("fetchDbviewerTable");
                        store.set('dbviewer_app_filter', this.appFilter);
                    }
                }
            },
            methods: {
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
                        window.location.hash = "#/manage/db/aggregate/" + this.db + "/" + this.collection;
                        break;
                    case 'indexes':
                        window.location.hash = "#/manage/db/indexes/" + this.db + "/" + this.collection;
                        break;
                    case 'data':
                        window.location.hash = "#/manage/db/" + this.db + "/" + this.collection;
                        break;
                    }
                },
                showFilterPopup: function(options) {
                    this.openFormDialog("queryFilter", _.extend({
                        filter: this.queryFilter || "",
                        projectionEnabled: this.projectionEnabled || false,
                        projection: this.projection || [],
                        fields: this.projection || [],
                        sortEnabled: this.sortEnabled || false,
                        sort: this.sort || ""
                    }, options));
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
                    this.queryFilter = formData.filter;
                    this.updatePath({"filter": this.queryFilter, "projection": this.projection, "sort": this.sort, "projectionEnabled": this.projectionEnabled, "sortEnabled": this.sortEnabled, "isDescentSort": this.isDescentSort});
                    // fire the request!
                    this.fetch(true);
                },
                removeFilters: function() {
                    this.queryFilter = null;
                    this.projectionEnabled = false;
                    this.projection = [];
                    this.sortEnabled = false;
                    this.sort = "";
                    app.navigate("#/manage/db/" + this.db + "/" + this.selectedCollection);
                    this.fetch(true);
                },
                clearFilters: function() {
                    this.$refs.dbviewerFilterForm.editedObject.projectionEnabled = false;
                    this.$refs.dbviewerFilterForm.editedObject.sortEnabled = false;
                    this.$refs.dbviewerFilterForm.editedObject.projection = null;
                    this.$refs.dbviewerFilterForm.editedObject.sort = null;
                    this.$refs.dbviewerFilterForm.editedObject.filter = null;
                    this.isDescentSort = false;
                },
                fetch: function(force) {
                    this.refresh = false;
                    this.tableStore.dispatch("fetchDbviewerTable", {_silent: !force});
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
                        collection: this.collection,
                        db: this.db,
                        url: "/o/export/db",
                        get_index: this.index
                    };
                    return apiQueryData;
                },
                refresh: function(force) {
                    this.refresh = true;
                    this.fetch(force);
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
                    if (this.collection && this.db) {
                        window.location.hash = "#/manage/db/" + this.db + "/" + this.collection + "/" + JSON.stringify(query);
                        if (this.index) {
                            window.location.hash = "#/manage/db/indexes/" + this.db + "/" + this.collection + "/" + JSON.stringify(query);
                        }
                    }
                },
                onCollectionChange: function() {
                    if (this.$route && this.$route.params && this.$route.params.query) {
                        delete this.$route.params.query;
                    }
                }
            },
            computed: {
                dbviewerAPIEndpoint: function() {
                    var url = '/db?api_key=' + countlyGlobal.member.api_key + '&app_id=' + countlyCommon.ACTIVE_APP_ID + '&dbs=' + this.db + '&collection=' + this.collection;
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
                    return this.collections[this.db].list.filter(function(collection) {
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
                }
            },
            created: function() {
                this.refresh = false;
                var routeHashItems = window.location.hash.split("/");
                if (routeHashItems.length === 6) {
                    this.collection = routeHashItems[5];
                    this.selectedCollection = this.collection;
                    if (store.get('dbviewer_app_filter')) {
                        this.appFilter = store.get('dbviewer_app_filter');
                    }
                    else {
                        this.appFilter = "all";
                    }
                    this.db = routeHashItems[4];
                }

                if (!this.db) {
                    this.db = 'countly';
                }
                if (this.$route.params && this.$route.params.query && JSON.parse(this.$route.params.query)) {
                    this.queryFilter = JSON.parse(this.$route.params.query).filter;
                    this.sort = JSON.parse(this.$route.params.query).sort;
                    this.projection = JSON.parse(this.$route.params.query).projection;
                    this.projectionEnabled = JSON.parse(this.$route.params.query).projectionEnabled;
                    this.sortEnabled = JSON.parse(this.$route.params.query).sortEnabled;
                    this.isDescentSort = JSON.parse(this.$route.params.query).isDescentSort;
                }

                if (!this.collection) {
                    if (this.collections[this.db].list.length) {
                        this.collection = this.collections[this.db].list[0].value;
                        this.selectedCollection = this.collection;
                        window.location = '#/manage/db/' + this.db + '/' + this.collections[this.db].list[0].value;
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
                executeQuery: function() {
                    var self = this;

                    try {
                        var query = JSON.stringify(JSON.parse(this.query));
                        this.queryLoading = true;
                        countlyDBviewer.executeAggregation(this.db, this.collection, query, countlyGlobal.ACTIVE_APP_ID, null, function(err, res) {
                            self.updatePath(self.query);
                            if (res) {
                                self.aggregationResult = res.aaData;
                                if (res.aaData.length) {
                                    self.fields = Object.keys(res.aaData[0]);
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
                        });
                        self.queryLoading = false;
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
                    window.location.hash = "#/manage/db/aggregate/countly/" + this.collection + "/" + query;
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
            component: DBViewerMain
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