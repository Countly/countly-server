/*global store, countlyCommon, $, jQuery*/
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

    countlyDBviewer.loadCollections = function(db, collection, page, filter, limit, sort, projection, isSort) {
        limit = limit || 20;
        var skip = (page - 1) * limit;
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + '/o/db/',
            data: {
                dbs: db,
                collection: collection,
                filter: filter || "{}",
                limit: limit,
                sort: (isSort) ? (typeof sort === "string") ? sort : JSON.stringify(sort) : "{}",
                projection: (typeof projection === "string") ? projection : JSON.stringify(projection),
                skip: skip
            },
            success: function(json) {
                _collections = json;
            }
        });
    };

    countlyDBviewer.executeAggregation = function(db, collection, aggregation, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/db",
            data: {
                dbs: db,
                collection: collection,
                aggregation: aggregation
            },
            success: function(json) {
                callback(json);
            }
        });
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
}(window.countlyDBviewer = window.countlyDBviewer || {}, jQuery));