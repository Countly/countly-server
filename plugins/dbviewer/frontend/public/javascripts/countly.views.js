var FEATURE_NAME = 'dbviewer';

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
        return {
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
            isIndexRequest: false
        }
    },
    watch: {
        selectedCollection: function(newVal) {
            window.location.hash = "#/manage/db/" + this.db + "/" + newVal;
        }
    },
    methods: {
        dbviewerActions: function(command) {
            switch(command) {
                case 'aggregation':
                    window.location.hash = "#/manage/db/aggregate/" + this.db + "/" + this.collection
                    break;
                case 'indexes':
                    window.location.hash = "#/manage/db/indexes/" + this.db + "/" + this.collection
                    break;
            }
        },
        showFilterPopup: function(options) {
            this.openFormDialog("queryFilter", _.extend({
                filter: this.queryFilter || "",
                projectionEnabled: this.projectionEnabled || false,
                fields: this.projection || [],
                sortEnabled: this.sortEnabled || false,
                sort: this.sort || ""
            }, options));
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
            // fire the request!
            this.fetch();
        },
        fetch: function(index) {
            var self = this;
            countlyDBviewer.loadCollections(this.db, this.collection, 1, this.queryFilter, 20, this.preparedSortObject, this.projectionEnabled ? this.preparedProjectionFields : null, this.sortEnabled, index)
                .done(function(response) {
                    self.collectionData = response.collections;
                    self.projectionOptions = Object.keys(self.collectionData[0]);
                })
            .catch(function(err) {
                // handle error case
            })
        }
    },
    computed: {
        preparedProjectionFields: function() {
            var ob = {};
            for (var i = 0; i < this.projection.length; i++) {
                ob[this.projection[i]] = 1;
            }
            return ob;
        },
        preparedSortObject: function() {
            var ob = {};
            ob[this.sort] = this.isDescentSort ? -1 : 1;
            return ob;
        }
    },
    created: function() {
        if (!this.collection) {
            if (this.collections[this.db].list.length) {
                window.location = '#/manage/db/' + this.db + '/' + this.collections[this.db].list[0].value;
            }
        }
        else {
            this.fetch(this.index);
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
                })
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
            queryLoading: false
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
                countlyDBviewer.executeAggregation(this.db, this.collection, query, countlyGlobal.ACTIVE_APP_ID, null, function(res) {
                    self.aggregationResult = res.aaData;
                    self.queryLoading = false;
                });
            }
            catch(err) {
                this.$message(CV.i18n('dbviewer.invalid-pipeline'));
            }
        }
    },
    created: function() {
        if (!(this.$route.params && this.$route.params.collection) || !(this.$route.params && this.$route.params.db)) {
            window.location = '#/manage/db';
        }
    }
});

var DBViewerMainView = new countlyVue.views.BackboneWrapper({
    component: DBViewerMain
});

var DBViewerTabView = new countlyVue.views.BackboneWrapper({
    component: DBViewerTab
});

var DBViewerAggregateView = new countlyVue.views.BackboneWrapper({
    component: DBViewerAggregate
});

if (countlyAuth.validateRead(FEATURE_NAME)) {
    app.route('/manage/db', 'dbs', function() {
        this.renderWhenReady(DBViewerMainView);
    });

    app.route('/manage/db/:db', 'dbs', function(db) {
        DBViewerMainView.params = {
            db: db
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

    app.route('/manage/db/aggregate/:db/:collection', 'dbs', function(db, collection) {
        DBViewerAggregateView.params = {
            db: db,
            collection: collection
        };
        this.renderWhenReady(DBViewerAggregateView);
    });
}

$(document).ready(function() {
    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.addMenu("management", {code: "db", url: "#/manage/db", text: "dbviewer.title", priority: 100});
    }
});