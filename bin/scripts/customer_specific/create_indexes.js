/**
 *  Ensure customer specific indexes for drill and remove redundant indexes
 *  Server: countly
 *  Path: countly dir
 *  Command: node create_indexes.js
 */
var DRY_RUN = true;
var DOC_COUNT = 1000;


var plugins = require("./plugins/pluginManager.js");

var bad_indexes = [
    '{"ts":1,"up.cc":1,"uid":1}',
    '{"ts":1,"m":1,"w":1,"d":1,"h":1,"uid":1,"c":1,"s":1,"dur":1}',
    '{"uid":1,"ts":1}',
    '{"_id":1,"cd":1}',
    '{"ts":1,"sg.name":1}',
    '{"uid":1,"sg.name":1}',
    '{"sg.name":1,"uid":1}',
    '{"ts":1,"sg.name":1,"uid":1,"c":1}',
    '{"sg.name":1,"up.cc":1,"ts":1}'
];

var result = [];

plugins.dbConnection('countly_drill').then(async function(db) {
    var collections = await db.collections();
    //filter only drill event collections
    collections = collections.filter((coll) => coll.collectionName.startsWith("drill_events"));
    console.log("Console log checking indexes");
    for (let i = 0; i < collections.length; i++) {
        console.log("Checking collection", collections[i].collectionName, i + 1, "of", collections.length);
        var count = await collections[i].estimatedDocumentCount();
        if (count > DOC_COUNT) {
            console.log("", "skipping, collection has more than", DOC_COUNT, "documents (", count, ")");
        }
        else {
            var indexes = await collections[i].listIndexes().toArray();
            var add = [];
            var remove = [];

            //removing bad indexes
            for (let j = 0; j < indexes.length; j++) {
                if (bad_indexes.includes(JSON.stringify(indexes[j].key))) {
                    remove.push(indexes[j].name);
                }
            }

            //making sure there is uid index for user merging
            if (!indexes.find((index) => JSON.stringify(index.key) == '{"uid":1}')) {
                add.push({uid: 1});
            }

            //check if it has view indexes
            if (indexes.find((index) => JSON.stringify(index.key) == '{"ts":1,"sg.name":1}') || indexes.find((index) => JSON.stringify(index.key) == '{"sg.name":1,"ts":1,"uid":1,"c":1,"up.sc":1}')) {
                //setup better view index if it does not exist
                if (!indexes.find((index) => JSON.stringify(index.key) == '{"sg.name":1,"ts":1,"uid":1,"c":1,"up.sc":1}')) {
                    add.push({"sg.name": 1, "ts": 1, "uid": 1, "c": 1, "up.sc": 1});
                }

                //add plain ts index for other purposes if it does not exist
                if (!indexes.find((index) => JSON.stringify(index.key) == '{"ts":1}')) {
                    add.push({"ts": 1});
                }
            }
            else {
                //else it is not a view 
                //setup better ts index if it does not exist
                if (!indexes.find((index) => JSON.stringify(index.key) == '{"ts":1,"uid":1,"c":1,"up.sc":1}')) {
                    add.push({"ts": 1, "uid": 1, "c": 1, "up.sc": 1});
                }

                //remove plain ts index, because we already have a better one
                if (indexes.find((index) => JSON.stringify(index.key) == '{"ts":1}')) {
                    remove.push({"ts": 1});
                }
            }
            if (add.length || remove.length) {
                console.log("", "needed changes to add", add, "to remove", remove);
                result.push({collection: collections[i].collectionName, add: add, remove: remove});
            }
            else {
                console.log("", "no changes needed");
            }
        }
        console.log("");
    }
    if (!result.length) {
        console.log("No changes needed");
    }
    else if (!DRY_RUN) {
        console.log("Applying changes");
        for (let i = 0; i < result.length; i++) {
            console.log("Applying change", i + 1, "of", result.length, "to", result[i].collection);
            for (let j = 0; j < result[i].add.length; j++) {
                console.log("", "creating index", result[i].add[j]);
                await db.collection(result[i].collection).createIndex(result[i].add[j]);
            }
            for (let j = 0; j < result[i].remove.length; j++) {
                console.log("", "dropping index", result[i].remove[j]);
                await db.collection(result[i].collection).dropIndex(result[i].remove[j]);
            }

        }
    }
    else {
        console.log("Needed changes");
        console.log(JSON.stringify(result, null, 2));
    }
    db.close();
});