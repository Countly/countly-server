/*Script to merge all drill meta */
const pluginManager = require('../../../../plugins/pluginManager.js');
var Promise = require("bluebird");
var crypto = require('crypto');

console.log("Merging all events collections into single collection");

function load_event_hashmap(countlyDB, callback) {
    var mapped = {};
    countlyDB.collection('events').find({}, {'list': 1}).toArray(function(err, events) {
        if (err) {
            callback(err, null);
        }
        else {
            events = events || [];
            for (let h = 0; h < events.length; h++) {
                if (events[h].list) {
                    for (let i = 0; i < events[h].list.length; i++) {
                        mapped["events" + crypto.createHash('sha1').update(events[h].list[i] + events[h]._id + "").digest('hex')] = {"a": events[h]._id + "", "e": events[h].list[i]};
                    }
                }
            }
            callback(null, mapped);
        }
    });
}

function merge_data_from_collection(countlyDB, collection, mapped) {
    return new Promise(function(resolve, reject) {
        if (!mapped[collection]) {
            console.log("Skipping collection " + collection + " as it is not found in events list");
            resolve();
            return;
        }
        else {
            var app_id = mapped[collection].a;
            var prefix = app_id + "_" + collection.replace("events", "");
            countlyDB.collection(collection).aggregate([{"$addFields": {"_id": {"$concat": [prefix, "_", "$_id"]}, "a": app_id,"e":mapped[collection].e}}, {"$merge": {"into": "events_data", "on": "_id", "whenMatched": "merge"}}], function(err) {
                if (err) {
                    console.log(err);
                    reject();
                }
                else {
                    resolve();
                }
            });
        }
    });
}

Promise.all(
    [
        pluginManager.dbConnection("countly")
    ])
    .spread(function(countlyDB) {
        countlyDB.collections(function(err, colls) {
            if (err) {
                console.log('Script failed. Exiting');
                countlyDB.close();
                countlyDB.close();
            }
            else {
                //filter out list with only drill_meta collections. but not outr merged collection
                for (var z = 0; z < colls.length; z++) {
                    colls[z] = colls[z].collectionName;
                }
                var collections = colls.filter(function(coll) {
                    return (coll.indexOf("events") === 0 && coll.length > 11);
                });
                //load all 
                load_event_hashmap(countlyDB, function(err, mapped) {
                    if (err) {
                        console.log(err);
                        console.log('Script failed. Exiting');
                        countlyDB.close();
                    }
                    else {
                        Promise.each(collections, function(coll) {
                            return merge_data_from_collection(countlyDB, coll, mapped);
                        }).then(function() {
                            console.log("All events collections merged");
                            countlyDB.close();
                        }).catch(function(err5) {
                            console.log(err5);
                            console.log('Script failed. Exiting');
                            countlyDB.close();
                        });
                    }
                });
            }
        });
    });