/**
 *  Description: This script fixes missing event segments in drill_meta
 *  or adds new values to existing biglist segments for the specified events.
 *  It scans the drill_events collection for the specified events and
 *  ensures their segments are present in drill_meta with correct types and values.
 *
 *  This is the event-segments counterpart to fix_missing_custom_user_props.js.
 *  Use this when the regular drill:fixMeta endpoint/job hits the 16MB MongoDB
 *  limit because the app has too many events/segments at once. By selecting
 *  one (or a few) events at a time you keep the working set bounded.
 *
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node fix_missing_event_segments.js
 */

const crypto = require('crypto');
const pluginManager = require('../../../plugins/pluginManager.js');

const APP_ID = ""; // required: set the app ID to process
const EVENTS = []; // required: specify event names to fix, e.g. ["purchase", "login"]
const START = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default: 30 days ago
const END = new Date(); // default: now
const dry_run = true;

let LIST_LIMIT = 100;
let BIG_LIST_LIMIT = 1000;

// Segments managed by core/preset that must not be inferred — keyed by event,
// values are segment keys with their forced type. Filled from drill's preset map.
const PRESET_SG = {
    "[CLY]_view": {
        start: "l", exit: "l", bounce: "l"
    },
    "[CLY]_session": {
        request_id: "s", prev_session: "s", prev_start: "d", postfix: "s", ended: "l"
    },
    "[CLY]_action": {
        x: "n", y: "n", width: "n", height: "n"
    },
    "[CLY]_crash": {
        name: "s",
        manufacture: "l",
        cpu: "l",
        opengl: "l",
        view: "l",
        browser: "l",
        os: "l",
        orientation: "l",
        nonfatal: "l",
        root: "l",
        online: "l",
        signal: "l",
        muted: "l",
        background: "l",
        app_version: "l",
        app_version_major: "n",
        app_version_minor: "n",
        app_version_patch: "n",
        app_version_prerelease: "l",
        app_version_build: "l",
        ram_current: "n",
        ram_total: "n",
        disk_current: "n",
        disk_total: "n",
        bat_current: "n",
        bat_total: "n",
        bat: "n",
        run: "n"
    }
};

if (!APP_ID) {
    console.error("Error: APP_ID is required. Please set it in the script.");
    process.exit(1);
}

if (!EVENTS.length) {
    console.error("Error: EVENTS is required. Please specify at least one event name to fix.");
    process.exit(1);
}

Promise.all([
    pluginManager.dbConnection("countly"),
    pluginManager.dbConnection("countly_drill")
]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    console.log("Date range: " + START.toISOString() + " - " + END.toISOString());
    console.log("Events to fix: " + EVENTS.join(", "));

    // drill_events stores `ts` as milliseconds (see drill.js: dbEventObject[ts] = time.mstimestamp)
    var tsMatch = {$gt: START.getTime(), $lt: END.getTime()};

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

        for (var ei = 0; ei < EVENTS.length; ei++) {
            var eventName = EVENTS[ei];
            console.log("\n[" + (ei + 1) + "/" + EVENTS.length + "] Processing event \"" + eventName + "\"...");
            await processEvent(drillDb, eventName, tsMatch);
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
 * Process a single event: collect distinct segment values, compare with existing
 * drill_meta, then either update the main meta doc (types) and/or biglist docs.
 * @param {Db} drillDb - drill database connection
 * @param {string} eventName - event key
 * @param {object} tsMatch - ts range filter ({$gt, $lt})
 * @returns {Promise} resolves when the event has been processed
 */
async function processEvent(drillDb, eventName, tsMatch) {
    var eventHash = crypto.createHash('sha1').update(eventName + APP_ID).digest('hex');
    var metaId = APP_ID + "_meta_" + eventHash;

    // Load existing meta for this event
    var metaDoc = await drillDb.collection("drill_meta").findOne({_id: metaId});
    var existingSg = (metaDoc && metaDoc.sg) ? metaDoc.sg : {};
    console.log("  Existing sg keys in drill_meta: " + Object.keys(existingSg).length);

    // Build skip set: segments that are already typed as s/d/n (not list types) — nothing to update for those.
    // Also include preset s/d/n types for this event so we don't try to infer over them.
    var skipKeys = {};
    for (var k in existingSg) {
        var t = existingSg[k] && existingSg[k].type;
        if (t === "s" || t === "d" || t === "n") {
            skipKeys[k] = t;
        }
    }
    if (PRESET_SG[eventName]) {
        for (var pk in PRESET_SG[eventName]) {
            var pt = PRESET_SG[eventName][pk];
            if ((pt === "s" || pt === "d" || pt === "n") && !existingSg[pk]) {
                skipKeys[pk] = pt;
            }
        }
    }

    // Stream through drill_events and accumulate distinct values per segment key.
    // We project sg only and filter in memory; this avoids building a large
    // server-side $group/$project pipeline that could itself hit limits.
    console.log("  Collecting distinct segment values from drill_events...");
    var pipeline = [
        {$match: {a: APP_ID + "", e: eventName, ts: tsMatch}},
        {$project: {_id: 0, sg: 1}}
    ];

    var stream = drillDb.collection("drill_events").aggregate(pipeline, {allowDiskUse: true}).stream();
    var collected = {}; // {segKey: {value: true, ...}}
    var arrayKeys = {}; // {segKey: true} — keys observed with array values
    var docCount = 0;

    await new Promise(function(resolve, reject) {
        stream.on('data', function(data) {
            docCount++;
            if (!data.sg) {
                return;
            }
            for (var sk in data.sg) {
                if (skipKeys[sk]) {
                    continue;
                }
                if (!collected[sk]) {
                    collected[sk] = {};
                }
                var val = data.sg[sk];
                if (Array.isArray(val)) {
                    arrayKeys[sk] = true;
                    for (var ai = 0; ai < val.length; ai++) {
                        if (val[ai] !== null && typeof val[ai] !== "undefined") {
                            collected[sk][val[ai] + ""] = true;
                        }
                    }
                }
                else if (val !== null && typeof val !== "undefined") {
                    collected[sk][val + ""] = true;
                }
            }
        });
        stream.on('error', reject);
        stream.once('end', resolve);
    });

    console.log("  Scanned " + docCount + " event document(s), found " + Object.keys(collected).length + " distinct segment(s)");

    if (Object.keys(collected).length === 0) {
        console.log("  Nothing to process for this event.");
        return;
    }

    // Load existing biglist documents we may need to compare against
    var existingBigLists = {};
    for (var sk2 in collected) {
        var bigListId = metaId + "_sg." + encodeKey(sk2);
        var bigListDoc = await drillDb.collection("drill_meta").findOne({_id: bigListId});
        if (bigListDoc && bigListDoc.values) {
            existingBigLists[sk2] = bigListDoc.values;
        }
    }

    // Build the update plan
    var mainDocUpdate = {};
    var bigListCreates = [];
    var bigListUpdates = [];

    for (var segKey in collected) {
        var fieldPath = "sg." + segKey;
        var existingMeta = existingSg[segKey];
        var values = collected[segKey];
        var isArray = !!arrayKeys[segKey];
        var distinctList = Object.keys(values);

        if (existingMeta && existingMeta.type !== "l" && existingMeta.type !== "a" && existingMeta.type !== "bl") {
            // Already a non-list type — nothing to update for this segment
            continue;
        }

        if (!existingMeta) {
            // New segment — determine type
            var type = determineType(distinctList, isArray);

            if (type === "n" || type === "d") {
                console.log("  [NEW] \"" + segKey + "\" type: " + type + " (no values to collect)");
                mainDocUpdate[fieldPath + ".type"] = type;
                continue;
            }

            var totalDistinct = distinctList.length;
            console.log("  [NEW] \"" + segKey + "\" type: " + type + ", " + totalDistinct + " distinct value(s)");

            if (totalDistinct > BIG_LIST_LIMIT) {
                console.log("    [WARNING] " + totalDistinct + " values exceeds big_list_limit (" + BIG_LIST_LIMIT + "). Setting type to 's' (string). Values will not be tracked.");
                mainDocUpdate[fieldPath + ".type"] = "s";
                continue;
            }

            if (totalDistinct > LIST_LIMIT) {
                console.log("    [INFO] " + totalDistinct + " values exceeds list_limit (" + LIST_LIMIT + "). Using type 'bl' (big list) instead of '" + type + "'.");
                type = "bl";
            }

            mainDocUpdate[fieldPath + ".type"] = type;

            var createValues = {};
            for (var ci = 0; ci < distinctList.length; ci++) {
                var encNew = encodeKey(distinctList[ci]).trim();
                if (encNew !== "") {
                    createValues[encNew] = true;
                }
            }
            bigListCreates.push({
                _id: metaId + "_sg." + encodeKey(segKey),
                app_id: APP_ID + "",
                e: eventName,
                type: "e",
                biglist: true,
                values: createValues
            });
        }
        else {
            // Existing list/array/biglist — find new values to add
            var existingValues = existingBigLists[segKey] || {};
            var existingCount = Object.keys(existingValues).length;
            var newValues = {};

            for (var di = 0; di < distinctList.length; di++) {
                var enc = encodeKey(distinctList[di]).trim();
                if (enc !== "" && !existingValues[enc]) {
                    newValues[enc] = true;
                }
            }

            var newCount = Object.keys(newValues).length;
            if (newCount === 0) {
                continue;
            }

            var totalAfterUpdate = existingCount + newCount;

            if (totalAfterUpdate > BIG_LIST_LIMIT) {
                console.log("  [WARNING] \"" + segKey + "\" adding " + newCount + " new value(s) would bring total to " + totalAfterUpdate + ", exceeding big_list_limit (" + BIG_LIST_LIMIT + "). Converting type to 's'. Values will no longer be tracked.");
                mainDocUpdate[fieldPath + ".type"] = "s";
                continue;
            }

            if (existingMeta.type === "l" && totalAfterUpdate > LIST_LIMIT) {
                console.log("  [INFO] \"" + segKey + "\" adding " + newCount + " new value(s) would bring total to " + totalAfterUpdate + ", exceeding list_limit (" + LIST_LIMIT + "). Upgrading type from 'l' to 'bl'.");
                mainDocUpdate[fieldPath + ".type"] = "bl";
            }

            console.log("  [UPDATE] \"" + segKey + "\" " + newCount + " new value(s) (existing: " + existingCount + ", after: " + totalAfterUpdate + ")");
            bigListUpdates.push({
                id: metaId + "_sg." + encodeKey(segKey),
                segKey: segKey,
                newValues: newValues
            });
        }
    }

    if (Object.keys(mainDocUpdate).length === 0 && bigListCreates.length === 0 && bigListUpdates.length === 0) {
        console.log("  Nothing to update for this event.");
        return;
    }

    if (dry_run) {
        if (Object.keys(mainDocUpdate).length > 0) {
            console.log("  DRY RUN: Would update main meta document (" + metaId + ") with:");
            console.log("    " + JSON.stringify(mainDocUpdate));
        }
        if (bigListCreates.length > 0) {
            console.log("  DRY RUN: Would create " + bigListCreates.length + " biglist document(s):");
            for (var b = 0; b < bigListCreates.length; b++) {
                console.log("    _id: " + bigListCreates[b]._id + " (" + Object.keys(bigListCreates[b].values).length + " values)");
            }
        }
        if (bigListUpdates.length > 0) {
            console.log("  DRY RUN: Would update " + bigListUpdates.length + " existing biglist document(s):");
            for (var u = 0; u < bigListUpdates.length; u++) {
                console.log("    _id: " + bigListUpdates[u].id + " (+" + Object.keys(bigListUpdates[u].newValues).length + " new values)");
            }
        }
    }
    else {
        // Update the main per-event meta document with new types
        if (Object.keys(mainDocUpdate).length > 0) {
            mainDocUpdate.app_id = APP_ID + "";
            mainDocUpdate.e = eventName;
            mainDocUpdate.type = "e";
            await drillDb.collection("drill_meta").updateOne(
                {_id: metaId},
                {$set: mainDocUpdate},
                {upsert: true}
            );
            console.log("  Updated main meta document.");
        }

        var bulk = null;

        for (var b2 = 0; b2 < bigListCreates.length; b2++) {
            if (!bulk) {
                bulk = drillDb.collection("drill_meta").initializeUnorderedBulkOp();
            }
            var doc = bigListCreates[b2];
            var docId = doc._id;
            delete doc._id;
            bulk.find({_id: docId}).upsert().updateOne({$set: doc});
        }

        for (var u2 = 0; u2 < bigListUpdates.length; u2++) {
            if (!bulk) {
                bulk = drillDb.collection("drill_meta").initializeUnorderedBulkOp();
            }
            var setObj = {};
            var nv = bigListUpdates[u2].newValues;
            for (var vk in nv) {
                setObj["values." + vk] = true;
            }
            // Set the meta fields on first creation/update so the doc is well-formed
            setObj.app_id = APP_ID + "";
            setObj.e = eventName;
            setObj.type = "e";
            setObj.biglist = true;
            bulk.find({_id: bigListUpdates[u2].id}).upsert().updateOne({$set: setObj});
        }

        if (bulk) {
            await bulk.execute();
            console.log("  Executed " + (bigListCreates.length + bigListUpdates.length) + " biglist operation(s).");
        }
    }
}

/**
 * Determine the type of a segment based on its values
 * Types: "n" (number), "d" (date), "l" (list/string), "a" (array)
 * @param {string[]} values - array of string-encoded values
 * @param {boolean} isArray - whether any document had this segment as an array
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
