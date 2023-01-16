/*global store, countlyCommon, countlyTaskManager, $, jQuery, app*/
(function(countlyDBviewer) {

    //Private Properties
    var _data = {},
        _collections = {},
        _document = {};

    //Public Methods
    countlyDBviewer.initialize = function(app_id) {


        if (typeof app_id === "object") {
            app_id = app_id._id;
        }

        var data = {};


        if (app_id && app_id !== "all") {
            data.app_id = app_id;
        }

        if ((app_id === "all" && store.get('dbviewer_selected_app')) && store.get('dbviewer_selected_app') !== "all") {
            data.app_id = store.get('dbviewer_selected_app')._id;
        }

        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/db",
            data: data,
            success: function(json) {
                _data = json;
                for (var i = 0; i < _data.length; i++) {
                    if (_data[i].collections) {
                        var list = [];
                        for (var j in _data[i].collections) {
                            list.push(j);
                        }
                        list.sort(function(a, b) {
                            if (a < b) {
                                return -1;
                            }
                            if (a > b) {
                                return 1;
                            }
                            return 0;
                        });
                        _data[i].list = list;
                    }
                }
            }
        });
    };

    countlyDBviewer.loadCollections = function(db, collection, page, filter, limit, sort, projection, isSort, isIndexRequest) {
        limit = limit || 20;
        var skip = (page - 1) * limit;
        var requestData = {
            dbs: db,
            collection: collection,
            filter: filter || "{}",
            limit: limit,
            sort: (isSort) ? (typeof sort === "string") ? sort : JSON.stringify(sort) : "{}",
            skip: skip
        };
        if (projection) {
            requestData.projection = (typeof projection === "string") ? projection : JSON.stringify(projection);
        }
        if (isIndexRequest) {
            requestData.action = "get_indexes";
        }
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + '/o/db/',
            data: requestData,
            success: function(json) {
                _collections = json;
            }
        });
    };

    countlyDBviewer.executeAggregation = function(db, collection, aggregation, app_id, task_id, callback) {
        if (task_id) {
            return $.when(countlyTaskManager.fetchResult(task_id, function(json) {
                callback(json);
            }));
        }
        else {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/db",
                data: {
                    dbs: db,
                    collection: collection,
                    aggregation: aggregation,
                    app_id: app_id,
                    type: "json"
                },
                success: function(json) {
                    if (json.aaData && json.aaData.task_id) {
                        app.recordEvent({
                            "key": "move-to-report-manager",
                            "count": 1,
                            "segmentation": { type: "dbviewer" }
                        });
                        countlyTaskManager.monitor(json.aaData.task_id);
                        callback(false);
                    }
                    else {
                        callback(json);
                    }
                }
            });
        }
    };

    countlyDBviewer.loadDocument = function(db, collection, id) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/db",
            data: {
                dbs: db,
                collection: collection,
                document: id
            },
            success: function(json) {
                _document = json;
            }
        });
    };

    countlyDBviewer.getData = function() {
        return _data;
    };

    countlyDBviewer.getCollections = function() {
        return _collections;
    };

    countlyDBviewer.getDocument = function() {
        return _document;
    };
    countlyDBviewer.getMongoTopData = function(callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + '/o/db/mongotop',
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };
    countlyDBviewer.getMongoStatData = function(callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + '/o/db/mongostat',
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };
}(window.countlyDBviewer = window.countlyDBviewer || {}, jQuery));