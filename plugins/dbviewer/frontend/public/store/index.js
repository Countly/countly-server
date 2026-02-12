import jQuery from 'jquery';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { fetchResult } from '../../../../../frontend/express/public/javascripts/countly/countly.task.manager.js';
import { monitor } from '../../../../../frontend/express/public/javascripts/countly/countly.task.manager.js';

var _data = {};
var _collections = {};
var _document = {};

export function initialize(app_id) {
    if (typeof app_id === "object") {
        app_id = app_id._id;
    }

    var data = {};

    if (app_id && app_id !== "all") {
        data.app_id = app_id;
    }

    if ((app_id === "all" && window.store.get('dbviewer_selected_app')) && window.store.get('dbviewer_selected_app') !== "all") {
        data.app_id = window.store.get('dbviewer_selected_app')._id;
    }

    return jQuery.ajax({
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
}

export function loadCollections(db, collection, page, filter, limit, sort, projection, isSort, isIndexRequest) {
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
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_URL + '/o/db/',
        data: requestData,
        success: function(json) {
            _collections = json;
        }
    });
}

export function executeAggregation(db, collection, aggregation, app_id, task_id, callback) {
    if (task_id) {
        return jQuery.when(fetchResult(task_id, function(json) {
            callback(json);
        }));
    }
    else {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/db",
            data: {
                dbs: db,
                collection: collection,
                aggregation: aggregation,
                app_id: app_id,
                type: "json",
                "preventRequestAbort": true
            },
            success: function(json) {
                if (json.aaData && json.aaData.task_id) {
                    monitor(json.aaData.task_id);
                    callback(false, false);
                }
                else {
                    callback(false, json);
                }
            },
            error: function(error) {
                callback(error, false);
            }
        });
    }
}

export function loadDocument(db, collection, id) {
    return jQuery.ajax({
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
}

export function getData() {
    return _data;
}

export function getCollections() {
    return _collections;
}

export function getDocument() {
    return _document;
}

export function getName(db, collection) {
    var currentDb = _data.find(function(dbObj) {
        return dbObj.name === db;
    }) || {};
    var [key] = Object.entries(currentDb.collections || {}).find(function([, value]) {
        return value === collection;
    });
    return key || collection;
}

export function getMongoTopData(callback) {
    return jQuery.ajax({
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
}

export function getMongoStatData(callback) {
    return jQuery.ajax({
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
}
