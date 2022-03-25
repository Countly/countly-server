var pluginManager = require('../../../../plugins/pluginManager.js'),
    async = require('async'),
    hash = require('object-hash');

/**
 * The function creates a hash of the object disregarding
 * the order of constituents (arrays, objects)
 * @param {Object} obj Bookmark signature parts
 * @returns {String} sha1 hash
 */
function getBookmarkSignature(obj) {
    var signObj = {
        app_id: obj.app_id,
        namespace: obj.namespace,
        event_key: obj.event_key,
        creator: obj.creator
    };

    ["query_obj", "by_val"].forEach((fieldKey) => {
        if (fieldKey in obj) {
            if (typeof obj[fieldKey] === 'string') {
                signObj[fieldKey] = JSON.parse(obj[fieldKey]);
            }
            else {
                signObj[fieldKey] = obj[fieldKey];
            }
        }
    });

    signObj.namespace = signObj.namespace || "";
    signObj.query_obj = signObj.query_obj || {};
    signObj.by_val = signObj.by_val || [];

    return hash(signObj, {
        unorderedArrays: true,
        unorderedObjects: true
    });
}

function processBookmark(obj) {

    if (obj.by_val) {
        if (typeof obj.by_val === 'string') {
            if (obj.by_val.trim().startsWith("[")) {
                obj.by_val = JSON.parse(obj.by_val);
            }
            else {
                obj.by_val = [obj.by_val];
            }
        }
        else {
            obj.by_val = obj.by_val;
        }

        obj.by_val = JSON.stringify(obj.by_val);
    }
    else {
        obj.by_val = "[]";
    }
    if (!obj.by_val_text) {
        obj.by_val_text = "";
    }

    if (!obj.query_obj) {
        obj.query_obj = "{}";
    }

    if (!obj.query_text) {
        obj.query_text = "";
    }

    obj.sign = getBookmarkSignature({
        app_id: obj.app_id,
        event_key: obj.event_key,
        query_obj: obj.query_obj,
        by_val: obj.by_val,
        creator: obj.creator
    });

    obj.prev_id = obj._id;

    delete obj._id;
}

function log(type) {
    return function(message, payload) {
        payload = payload || "";
        console.log(`[fix_bookmarks.js] ${type}: ${message}`, payload);
    }
}

var error = log("ERROR");
var warn = log("WARN");
var success = log("SUCCESS");

pluginManager.dbConnection("countly_drill").then((db) => {

    var source = "drill_bookmarks",
        sink = "drill_bookmarks",
        hardDelete = true;

    function deleteOld(id, callback) {
        if (hardDelete){
            db.collection(source).remove({"_id": id}, function(deleteError, res) {
                if (deleteError) {
                    error(`DB error while deleting old drill bookmark {_id: ${id}}`, deleteError);
                }
                callback(deleteError, res);
            });
        }
        else {
            db.collection(source).update({"_id": id}, {$set: {namespace: 'deleted'}}, function(deleteError, res) {
                if (deleteError) {
                    error(`DB error while soft deleting old drill bookmark {_id: ${id}}`, deleteError);
                }
                callback(deleteError, res);
            });
        }
    }

    function insertNew(obj, callback) {
        db.collection(sink).insertOne(obj, function(insertError, insertionRes) {
            if (insertError) {
                error(`DB error while inserting processed drill bookmark: ${JSON.stringify(obj, null, 4)}`, insertError);
            }
            callback(insertError, insertionRes)
        });
    }

    function upgrade(bookmark, done) {
        if (!bookmark.action) {
            done();
        }
        else if (bookmark.action === "upgrade") {
            delete bookmark.action;
            insertNew(bookmark, function(insertError, obj) {
                if (!insertError && obj.insertedId) {
                    deleteOld(bookmark.prev_id, function(deleteError, res) {
                        if (!deleteError) {
                            success(`Bookmark ${bookmark.prev_id} moved to ${obj.insertedId}.`);
                        }
                        done();
                    });
                }
                else {
                    done();
                }
            });
        }
        else if (bookmark.action === "delete") {
            deleteOld(bookmark.prev_id, function(deleteError, res) {
                if (!deleteError) {
                    warn(`Bookmark ${bookmark.prev_id} is deleted (duplicate sign).`);
                }
                done();
            });
        }
    }

    db.collection(sink).createIndex({ "sign": 1 }, { unique: true }, function() {});

    db.collection(source).find().toArray(function(err, result) {

        var signsLookup = {};

        result.forEach(function(bookmark) {
            if (bookmark.sign || bookmark.namespace) {
                return warn(`Bookmark ${bookmark._id} is already processed, skipping...`);
            }
            processBookmark(bookmark);
            if (!signsLookup[bookmark.sign]) {
                bookmark.action = "upgrade";
                signsLookup[bookmark.sign] = true;
            }
            else {
                bookmark.action = "delete";
                return warn(`A bookmark with same sign ${bookmark.sign} has already been inserted, latter will be deleted.`);
            }
        })

        async.forEach(result, upgrade, function() {
            success("Finished processing drill bookmarks.");
            db.close();
        });
    });

});

/*

Old format:

{
    "app_id": "5ccc6c81f8315136327757a7",
    "event_key": "[CLY]_session",
    "name": "Test bookmarks",
    "desc": "Test bookmarks",
    "global": true,
    "creator": "5fd8b6fe31131d7f680ca777",
    "event_app_id": "c535971cf35af2a9f09c9b3ce1ec201e",
    "query_obj": "{\"up.av\":{\"$in\":[\"6:4:1\"]}}",
    "query_text": "App Version = 6.4.1"
    "by_val": "[]",
    "by_val_text": "",
    //
    "_id": "01054c68313dbc181aa34327a3ccd023", // Custom string id
}

New format: 

{
    "app_id": "5c62927f23864d069e405717",
    "event_key": "[CLY]_session",
    "name": "t1",
    "desc": "",
    "global": true,
    "creator": "60ad16ef6aff41f13fe49a0d",
    "event_app_id": "eb7a0f37aac21566de13ef8f3945d700",
    "query_obj": "{\"up.av\":{\"rgxntc\":[\"asd\"]}}",
    "query_text": "App Version doesnt contain asd",
    "by_val": "[]",
    "by_val_text": "",
    //
    "namespace": "activity-map", (doesn't exist if drill)
    "sign": "7fc7db14f548337cfc34088d48f30ed8d3c50c05",
    //
    "_id": "ObjectId(6138534e135e969971377436)", // ObjectId
}

*/
