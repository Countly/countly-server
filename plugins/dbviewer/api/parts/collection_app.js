/**
* Which app a DB Viewer collection belongs to
* @module plugins/dbviewer/api/parts/collection_app
*/

var common = require('../../../../api/utils/common.js');
var rights = require('../../../../api/utils/rights.js');

/**
* app_id recorded on a long task that belongs to no app. It is what a task created without an
* app has always been stored with, and what the task list's "independent" filter looks for.
* @type {string}
**/
var NO_APP = "undefined";

/**
* Whether a collection name is an event or view collection, named by a hash of the event or
* segment and the app id
* @param {string} collection - collection name
* @returns {boolean} true for a hashed collection
**/
function isHashedCollection(collection) {
    return collection.indexOf("events") === 0 || collection.indexOf("drill_events") === 0 || collection.indexOf("app_viewdata") === 0;
}

/**
* App of a per-app collection, named with the app id as its suffix (app_users<app id>, ...)
* @param {string} collection - collection name
* @returns {string|null} app id, or null when the name does not end with one
**/
function suffixAppId(collection) {
    if (isHashedCollection(collection)) {
        return null;
    }
    var match = /([0-9a-f]{24})$/.exec(collection);
    return match ? match[1] : null;
}

/**
* Stages that read another collection into the pipeline's result
* @type {string[]}
**/
var JOIN_STAGES = ["$lookup", "$graphLookup", "$unionWith"];

/**
* Whether an aggregation reads any collection besides its own, at any depth
* @param {*} value - pipeline, or any part of it
* @returns {boolean} true if a join stage is present
**/
function hasJoin(value) {
    if (Array.isArray(value)) {
        return value.some(hasJoin);
    }
    if (value && typeof value === "object") {
        return Object.keys(value).some(function(key) {
            return JOIN_STAGES.indexOf(key) !== -1 || hasJoin(value[key]);
        });
    }
    return false;
}

/**
* Resolve the app an aggregation's result belongs to. A pipeline that joins other
* collections can hold data of any app, so it belongs to none.
* @param {params} params - request params, with the member
* @param {string} collection - collection the aggregation runs on
* @param {Array} aggregation - aggregation pipeline
* @param {function} callback - called with the app id, or NO_APP
**/
function resolveAggregationApp(params, collection, aggregation, callback) {
    if (hasJoin(aggregation)) {
        callback(NO_APP);
        return;
    }
    resolveCollectionApp(params, collection, callback);
}

/**
* Resolve the app a collection belongs to, for recording on a long task about it.
* Collections shared by all apps belong to none.
* @param {params} params - request params, with the member
* @param {string} collection - collection name
* @param {function} callback - called with the app id, or NO_APP
**/
function resolveCollectionApp(params, collection, callback) {
    collection = collection + "";
    var appId = suffixAppId(collection);
    if (appId) {
        callback(appId);
        return;
    }
    if (!isHashedCollection(collection)) {
        callback(NO_APP);
        return;
    }
    var query = {};
    if (!params.member.global_admin) {
        var appIds = (rights.getUserApps(params.member) || []).map(function(id) {
            return common.db.ObjectID(id + "");
        });
        query._id = {$in: appIds};
    }
    common.db.collection("apps").find(query, {projection: {_id: 1, name: 1}}).toArray(function(err, apps) {
        if (err) {
            callback(NO_APP);
            return;
        }
        rights.dbLoadEventsData(params, apps || [], function() {
            callback(rights.getHashedCollectionAppId(collection) || NO_APP);
        });
    });
}

module.exports = {
    NO_APP: NO_APP,
    suffixAppId: suffixAppId,
    resolveCollectionApp: resolveCollectionApp,
    resolveAggregationApp: resolveAggregationApp
};
