/**
 *  Description: This script fixes missing custom user properties in drill_meta
 *  or adds new values to existing biglist properties.
 *  It scans the app_users collection for the specified custom properties and
 *  ensures they are present in drill_meta with correct types and values.
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node fix_missing_custom_user_props.js
 */

const pluginManager = require('../../../plugins/pluginManager.js');

const APP_ID = ""; // required: set the app ID to process
const PROPS = []; // required: specify custom property names to fix, e.g. ["myProp1", "myProp2"]
const START = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default: 30 days ago
const END = new Date(); // default: now
const dry_run = true;

let LIST_LIMIT = 100;
let BIG_LIST_LIMIT = 1000;

if (!APP_ID) {
    console.error("Error: APP_ID is required. Please set it in the script.");
    process.exit(1);
}

if (!PROPS.length) {
    console.error("Error: PROPS is required. Please specify at least one property name to fix.");
    process.exit(1);
}

Promise.all([
    pluginManager.dbConnection("countly"),
    pluginManager.dbConnection("countly_drill")
]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    console.log("Date range: " + START.toISOString() + " - " + END.toISOString());
    console.log("Properties to fix: " + PROPS.join(", "));

    var lacStart = Math.round(START.getTime() / 1000);
    var lacEnd = Math.round(END.getTime() / 1000);
    var lacMatch = {$gt: lacStart, $lt: lacEnd};
    var collection = "app_users" + APP_ID;

    try {
        // Load drill config limits from the database if available
        var pluginsDoc = await countlyDb.collection("plugins").findOne({_id: "plugins"});
        if (pluginsDoc && pluginsDoc.drill) {
            if (pluginsDoc.drill.list_limit !== undefined) {
                LIST_LIMIT = parseInt(pluginsDoc.drill.list_limit, 10) || LIST_LIMIT;
            }
            if (pluginsDoc.drill.big_list_limit !== undefined) {
                BIG_LIST_LIMIT = parseInt(pluginsDoc.drill.big_list_limit, 10) || BIG_LIST_LIMIT;
            }
        }
        console.log("Limits: list_limit=" + LIST_LIMIT + ", big_list_limit=" + BIG_LIST_LIMIT);

        // Get existing drill_meta for user properties
        var metaDoc = await drillDb
            .collection("drill_meta")
            .findOne({_id: APP_ID + "_meta_up"});
        var existingCustom = (metaDoc && metaDoc.custom) ? metaDoc.custom : {};
        console.log("Existing custom keys in drill_meta: " + Object.keys(existingCustom).length);

        // Load existing biglist documents for the requested props
        var existingBigLists = {};
        for (var p = 0; p < PROPS.length; p++) {
            var bigListId = APP_ID + "_meta_up_custom." + encodeKey(PROPS[p]);
            var bigListDoc = await drillDb.collection("drill_meta").findOne({_id: bigListId});
            if (bigListDoc && bigListDoc.values) {
                existingBigLists[PROPS[p]] = bigListDoc.values;
            }
        }

        // Process each property
        var mainDocUpdate = {};
        var bigListUpdates = [];
        var bigListCreates = [];

        for (var pi = 0; pi < PROPS.length; pi++) {
            var prop = PROPS[pi];
            var fieldPath = "custom." + prop;
            var existingMeta = existingCustom[prop];

            console.log("[" + (pi + 1) + "/" + PROPS.length + "] Processing \"" + prop + "\"...");

            // If property already exists and is not a list type, skip entirely
            if (existingMeta && existingMeta.type !== "l" && existingMeta.type !== "a" && existingMeta.type !== "bl") {
                console.log("  [SKIP] Already exists with type: " + existingMeta.type + " (not a list type, nothing to update)");
                continue;
            }

            if (!existingMeta) {
                // New property — determine type from a small sample first
                var samples = await countlyDb.collection(collection).aggregate([
                    {$match: {lac: lacMatch, [fieldPath]: {$exists: true}}},
                    {$project: {_id: 0, val: "$" + fieldPath}},
                    {$limit: 100}
                ]).toArray();

                if (samples.length === 0) {
                    console.log("  No users with this property in the given date range.");
                    continue;
                }

                var isArray = samples.some(function(s) {
                    return Array.isArray(s.val);
                });
                var sampleValues = [];
                for (var si = 0; si < samples.length; si++) {
                    if (Array.isArray(samples[si].val)) {
                        for (var ai = 0; ai < samples[si].val.length; ai++) {
                            sampleValues.push(samples[si].val[ai] + "");
                        }
                    }
                    else {
                        sampleValues.push(samples[si].val + "");
                    }
                }

                var type = determineType(sampleValues, isArray);

                if (type === "n" || type === "d") {
                    console.log("  [NEW] type: " + type + " (determined from " + samples.length + " samples, no values to collect)");
                    mainDocUpdate["custom." + prop + ".type"] = type;
                    continue;
                }

                // List/array type — need full distinct values aggregation
                console.log("  [NEW] type: " + type + ", collecting distinct values...");
                var distinctValues = await aggregateDistinctValues(countlyDb, collection, fieldPath, lacMatch, isArray);
                var totalDistinct = Object.keys(distinctValues).length;
                console.log("  Found " + totalDistinct + " distinct value(s)");

                // Apply limits
                if (totalDistinct > BIG_LIST_LIMIT) {
                    // Too many values — convert to string type, no values tracked
                    console.log("  [WARNING] " + totalDistinct + " values exceeds big_list_limit (" + BIG_LIST_LIMIT + "). Setting type to 's' (string). Values will not be tracked.");
                    mainDocUpdate["custom." + prop + ".type"] = "s";
                    continue;
                }

                if (totalDistinct > LIST_LIMIT) {
                    // Between list_limit and big_list_limit — use bl type
                    console.log("  [INFO] " + totalDistinct + " values exceeds list_limit (" + LIST_LIMIT + "). Setting type to 'bl' (big list) instead of '" + type + "'.");
                    type = "bl";
                }

                mainDocUpdate["custom." + prop + ".type"] = type;

                var createValues = {};
                for (var cv in distinctValues) {
                    var enc = encodeKey(cv).trim();
                    if (enc !== "") {
                        createValues[enc] = true;
                    }
                }
                bigListCreates.push({
                    _id: APP_ID + "_meta_up_custom." + encodeKey(prop),
                    app_id: APP_ID,
                    type: "up",
                    e: "custom",
                    biglist: true,
                    values: createValues
                });
            }
            else {
                // Existing list type — collect distinct values and find new ones
                console.log("  Existing type: " + existingMeta.type + ", collecting distinct values...");

                var isArrayExisting = existingMeta.type === "a";
                var distinctValuesExisting = await aggregateDistinctValues(countlyDb, collection, fieldPath, lacMatch, isArrayExisting);
                var existingValues = existingBigLists[prop] || {};
                var existingCount = Object.keys(existingValues).length;

                var newValues = {};
                for (var dv in distinctValuesExisting) {
                    var enc2 = encodeKey(dv).trim();
                    if (enc2 !== "" && !existingValues[enc2]) {
                        newValues[enc2] = true;
                    }
                }

                var newCount = Object.keys(newValues).length;
                if (newCount === 0) {
                    console.log("  [SKIP] No new values (all " + Object.keys(distinctValuesExisting).length + " already in biglist)");
                    continue;
                }

                var totalAfterUpdate = existingCount + newCount;

                // Check if adding new values would exceed big_list_limit
                if (totalAfterUpdate > BIG_LIST_LIMIT) {
                    console.log("  [WARNING] Adding " + newCount + " new values would bring total to " + totalAfterUpdate + ", exceeding big_list_limit (" + BIG_LIST_LIMIT + "). Converting type to 's' (string). Values will no longer be tracked.");
                    mainDocUpdate["custom." + prop + ".type"] = "s";
                    // Don't add values — the biglist doc will become stale but that's consistent
                    // with how drill.js handles this (checkListsInMeta deletes it later)
                    continue;
                }

                // Check if adding new values would cross the list_limit threshold (l -> bl)
                if (existingMeta.type === "l" && totalAfterUpdate > LIST_LIMIT) {
                    console.log("  [INFO] Adding " + newCount + " new values would bring total to " + totalAfterUpdate + ", exceeding list_limit (" + LIST_LIMIT + "). Upgrading type from 'l' to 'bl' (big list).");
                    mainDocUpdate["custom." + prop + ".type"] = "bl";
                }

                console.log("  [UPDATE] " + newCount + " new value(s) to add (existing: " + existingCount + ", after: " + totalAfterUpdate + ")");
                bigListUpdates.push({
                    id: APP_ID + "_meta_up_custom." + encodeKey(prop),
                    propKey: prop,
                    newValues: newValues
                });
            }
        }

        // Check if there's anything to do
        if (Object.keys(mainDocUpdate).length === 0 && bigListCreates.length === 0 && bigListUpdates.length === 0) {
            console.log("\nNothing to update.");
            return;
        }

        if (dry_run) {
            if (Object.keys(mainDocUpdate).length > 0) {
                console.log("\nDRY RUN: Would update main meta document (" + APP_ID + "_meta_up) with:");
                console.log(JSON.stringify(mainDocUpdate, null, 2));
            }
            if (bigListCreates.length > 0) {
                console.log("DRY RUN: Would create " + bigListCreates.length + " biglist document(s):");
                for (var b = 0; b < bigListCreates.length; b++) {
                    console.log("  _id: " + bigListCreates[b]._id + " (" + Object.keys(bigListCreates[b].values).length + " values)");
                }
            }
            if (bigListUpdates.length > 0) {
                console.log("DRY RUN: Would update " + bigListUpdates.length + " existing biglist document(s):");
                for (var u = 0; u < bigListUpdates.length; u++) {
                    console.log("  _id: " + bigListUpdates[u].id + " (+" + Object.keys(bigListUpdates[u].newValues).length + " new values)");
                }
            }
        }
        else {
            // Update main meta_up document for new properties
            if (Object.keys(mainDocUpdate).length > 0) {
                await drillDb.collection("drill_meta").updateOne(
                    {_id: APP_ID + "_meta_up"},
                    {$set: mainDocUpdate},
                    {upsert: true}
                );
                console.log("Updated main meta document.");
            }

            var bulk = null;

            // Create new biglist documents
            for (var b2 = 0; b2 < bigListCreates.length; b2++) {
                if (!bulk) {
                    bulk = drillDb.collection("drill_meta").initializeUnorderedBulkOp();
                }
                var doc = bigListCreates[b2];
                var docId = doc._id;
                delete doc._id;
                bulk.find({_id: docId}).upsert().updateOne({$set: doc});
            }

            // Update existing biglist documents with new values
            for (var u2 = 0; u2 < bigListUpdates.length; u2++) {
                if (!bulk) {
                    bulk = drillDb.collection("drill_meta").initializeUnorderedBulkOp();
                }
                var setObj = {};
                var nv = bigListUpdates[u2].newValues;
                for (var vk in nv) {
                    setObj["values." + vk] = true;
                }
                bulk.find({_id: bigListUpdates[u2].id}).upsert().updateOne({$set: setObj});
            }

            if (bulk) {
                await bulk.execute();
                console.log("Executed " + (bigListCreates.length + bigListUpdates.length) + " biglist operation(s).");
            }
        }
    }
    catch (err) {
        console.error("Error:", err);
    }
    finally {
        countlyDb.close();
        drillDb.close();
        console.log("\nDone.");
    }
});

/**
 * Aggregate distinct values for a custom property using MongoDB aggregation
 * @param {Db} db - database connection
 * @param {string} collectionName - app_users collection name
 * @param {string} fieldPath - dot-notation field path (e.g. "custom.myProp")
 * @param {object} lacMatch - lac range filter ({$gt, $lt})
 * @param {boolean} isArray - whether to unwind array values
 * @returns {object} map of distinct values {value: true, ...}
 */
async function aggregateDistinctValues(db, collectionName, fieldPath, lacMatch, isArray) {
    var pipeline = [
        {$match: {lac: lacMatch, [fieldPath]: {$exists: true}}}
    ];

    if (isArray) {
        pipeline.push({$unwind: {path: "$" + fieldPath, preserveNullAndEmptyArrays: false}});
    }

    pipeline.push({$group: {_id: "$" + fieldPath}});

    var results = await db.collection(collectionName).aggregate(pipeline, {allowDiskUse: true}).toArray();
    var values = {};
    for (var i = 0; i < results.length; i++) {
        if (results[i]._id !== null && results[i]._id !== undefined) {
            values[results[i]._id + ""] = true;
        }
    }
    return values;
}

/**
 * Determine the type of a property based on its values
 * Types: "n" (number), "d" (date), "l" (list/string), "a" (array)
 * @param {string[]} values - array of string-encoded values
 * @param {boolean} isArray - whether any user had this as an array value
 * @returns {string} type code
 */
function determineType(values, isArray) {
    if (isArray) {
        return "a";
    }

    var isNumber = true;
    var isDate = true;

    for (var i = 0; i < values.length; i++) {
        if (!isNumeric(values[i]) || values[i].length > 16) {
            isNumber = false;
            isDate = false;
            break;
        }
        if (values[i].length !== 10 && values[i].length !== 13) {
            isDate = false;
        }
    }

    if (isNumber && isDate) {
        return "d";
    }
    if (isNumber) {
        return "n";
    }
    return "l";
}

/**
 * Check if value is numeric
 * @param {*} val - value to check
 * @returns {boolean} true if numeric
 */
function isNumeric(val) {
    if (typeof val === "number") {
        return true;
    }
    if (typeof val === "string" && val.trim() !== "") {
        return !isNaN(Number(val));
    }
    return false;
}

/**
 * Encode key for MongoDB storage (replace $ and . characters)
 * @param {string} key - key to encode
 * @returns {string} encoded key
 */
function encodeKey(key) {
    return (key + "").replace(/^\$/g, "&#36;").replace(/\./g, '&#46;');
}
