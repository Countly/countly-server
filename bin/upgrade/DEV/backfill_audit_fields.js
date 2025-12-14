/* 
This script backfills audit fields (created_at, created_by, updated_at, updated_by) for existing records
that don't have these fields. It uses the earliest available timestamp field or current time as fallback.
*/

// Use the top-level Countly pluginManager so config.js is resolved correctly
// Script path: core/bin/upgrade/DEV/backfill_audit_fields.js
// Root plugins path: ../../../../plugins/pluginManager.js
var pluginManager = require('../../../../plugins/pluginManager.js');
const OPERATION_BATCH_SIZE = 200;
const MS_THRESHOLD = 10000000000;

console.log("Starting audit fields backfill...");

(async() => {
    let countlyDb;
    let outDb;
    try {
        [countlyDb, outDb] = await Promise.all([
            pluginManager.dbConnection("countly"),
            pluginManager.dbConnection("countly_out")
        ]);
        console.log("Connected to Mongo databases");
    }
    catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
        return;
    }
    const now = Math.floor(Date.now() / 1000); // Store timestamps in seconds
    let apps = [];
    try {
        apps = await countlyDb.collection('apps').find({}, {projection: {_id: 1}}).toArray();
        console.log(`Loaded ${apps.length} apps for per-app collections`);
    }
    catch (error) {
        console.error("Unable to load apps list, per-app collections will be skipped:", error);
    }

    function getNestedValue(obj, path) {
        if (!obj || !path) {
            return undefined;
        }
        return path.split('.').reduce((value, part) => {
            if (value && typeof value === 'object' && part in value) {
                return value[part];
            }
            return undefined;
        }, obj);
    }

    function coerceTimestamp(value, fallback) {
        if (typeof value === "number") {
            return value > MS_THRESHOLD ? Math.floor(value / 1000) : value;
        }
        if (value instanceof Date) {
            return Math.floor(value.getTime() / 1000);
        }
        return typeof value !== "undefined" ? value : fallback;
    }

    /**
     * Backfill audit fields for a collection
     * @param {string} collectionName - Collection name
     * @param {string} timestampField - Field to use for created_at (e.g., 'created', 'created_at', 'ts')
     * @param {string} creatorField - Field to use for created_by (e.g., 'creator', 'created_by', 'createdBy')
     * @param {boolean} useOutDb - Whether to use outDb instead of db
     */
    async function backfillCollection(collectionName, timestampField, creatorField, useOutDb = false) {
        return new Promise((resolve, reject) => {
            try {
                const db = useOutDb ? outDb : countlyDb;
                if (!db) {
                    console.log(`Skipping ${collectionName} - database not available`);
                    return resolve();
                }

                let requests = [];
                let processed = 0;
                let updated = 0;

                const cursor = db.collection(collectionName).find({
                    $or: [
                        { created_at: { $exists: false } },
                        { updated_at: { $exists: false } }
                    ]
                });

                cursor.forEach(async function(doc) {
                    processed++;
                    const update = {};
                    let needsUpdate = false;

                    // Set or normalize created_at
                    if (typeof doc.created_at === "undefined") {
                        const timestampValue = timestampField ? getNestedValue(doc, timestampField) : undefined;
                        update.created_at = coerceTimestamp(timestampValue, now);
                        needsUpdate = true;
                    }
                    else if (typeof doc.created_at === "number" && doc.created_at > MS_THRESHOLD) {
                        // Normalize ms -> s for existing created_at
                        update.created_at = Math.floor(doc.created_at / 1000);
                        needsUpdate = true;
                    }

                    // Set created_by
                    if (typeof doc.created_by === "undefined" && creatorField) {
                        const creatorValue = getNestedValue(doc, creatorField);
                        if (typeof creatorValue !== "undefined" && creatorValue !== null) {
                            update.created_by = String(creatorValue);
                            needsUpdate = true;
                        }
                    }

                    // Set or normalize updated_at (use created_at if available, otherwise use timestamp field or now)
                    if (typeof doc.updated_at === "undefined") {
                        if (doc.created_at || update.created_at) {
                            update.updated_at = doc.created_at || update.created_at;
                        }
                        else {
                            const timestampValue = timestampField ? getNestedValue(doc, timestampField) : undefined;
                            update.updated_at = coerceTimestamp(timestampValue, now);
                        }
                        needsUpdate = true;
                    }
                    else if (typeof doc.updated_at === "number" && doc.updated_at > MS_THRESHOLD) {
                        // Normalize ms -> s for existing updated_at
                        update.updated_at = Math.floor(doc.updated_at / 1000);
                        needsUpdate = true;
                    }

                    // Set updated_by (use created_by if available)
                    if (typeof doc.updated_by === "undefined" && (doc.created_by || update.created_by)) {
                        update.updated_by = doc.created_by || update.created_by;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        requests.push({
                            'updateOne': {
                                'filter': { '_id': doc._id },
                                'update': { '$set': update }
                            }
                        });
                        updated++;
                    }

                    if (requests.length >= OPERATION_BATCH_SIZE) {
                        try {
                            await db.collection(collectionName).bulkWrite(requests, { ordered: false });
                            console.log(`  Processed ${processed} documents, updated ${updated} in ${collectionName}`);
                            requests = [];
                        }
                        catch (ex) {
                            console.error(`Error updating ${collectionName}:`, ex);
                        }
                    }
                }, async function() {
                    if (requests.length > 0) {
                        try {
                            await db.collection(collectionName).bulkWrite(requests, { ordered: false });
                        }
                        catch (ex) {
                            console.error(`Error updating ${collectionName}:`, ex);
                        }
                    }
                    console.log(`SUCCESS: Backfilled ${updated} documents in ${collectionName} (processed ${processed} total)`);
                    resolve();
                });
            }
            catch (e) {
                console.error(`Error while backfilling ${collectionName}:`, e);
                reject(`Error while backfilling ${collectionName}, ${e}`);
            }
        });
    }

    async function backfillPerAppCollections(collectionPrefix, timestampField, creatorField, useOutDb = false) {
        if (!apps.length) {
            console.log(`Skipping ${collectionPrefix}* collections - no apps available`);
            return;
        }
        for (const app of apps) {
            const appId = app._id.toString();
            const collectionName = collectionPrefix + appId;
            await backfillCollection(collectionName, timestampField, creatorField, useOutDb);
        }
    }

    async function run() {
        try {
            console.log("\n=== Backfilling members ===");
            await backfillCollection('members', 'created_at', 'created_by');

            console.log("\n=== Backfilling drill bookmarks ===");
            await backfillCollection('drill_bookmarks', 'created', 'created_by', true);

            console.log("\n=== Backfilling _dwProcess ===");
            await backfillCollection('_dwProcess', 'ts', null, true);

            console.log("\n=== Backfilling concurrent user alerts ===");
            await backfillCollection('concurrent_users_alerts', 'defined_at', 'created_by');

            console.log("\n=== Backfilling content blocks ===");
            await backfillCollection('content_blocks', 'details.created', 'details.creatorId');

            console.log("\n=== Backfilling content queue ===");
            await backfillCollection('content_queue', 'created_ts', null);

            console.log("\n=== Backfilling groups ===");
            await backfillCollection('groups', 'created', 'created_by');

            console.log("\n=== Backfilling cohorts ===");
            await backfillCollection('cohorts', 'created_at', 'creator');

            console.log("\n=== Backfilling profile group imports ===");
            await backfillCollection('profile_groups_imports', 'created_at', null);

            console.log("\n=== Backfilling data manager transforms ===");
            await backfillCollection('datamanager_transforms', 'created', 'created_by');

            console.log("\n=== Backfilling calculated metrics ===");
            await backfillCollection('calculated_metrics', 'created', 'creator');

            console.log("\n=== Backfilling crash symbols (per-app) ===");
            await backfillPerAppCollections('app_crashsymbols', 'ts', null);

            console.log("\n=== Backfilling geo fences ===");
            await backfillCollection('geos', 'created', 'created_by');

            console.log("\n=== Backfilling journey definitions ===");
            await backfillCollection('journey_definition', 'created', 'createdBy');

            console.log("\n=== Backfilling journey versions ===");
            await backfillCollection('journey_versions', 'created', 'createdBy');

            console.log("\n=== Backfilling funnels ===");
            await backfillCollection('funnels', 'created', 'creator');

            console.log("\n=== Backfilling AB testing experiments (per-app) ===");
            await backfillPerAppCollections('ab_testing_experiments', 'created_at', 'created_by', true);

            console.log("\n=== Backfilling flows ===");
            await backfillCollection('flow_schemas', 'created', 'creator');

            console.log("\n=== Backfilling feedback widgets ===");
            await backfillCollection('feedback_widgets', 'created', 'creator');

            console.log("\n=== Backfilling blocked users (per-app) ===");
            await backfillPerAppCollections('blocked_users', null, null);

            console.log("\n=== Backfilling hooks ===");
            await backfillCollection('hooks', 'created_at', 'createdBy');

            console.log("\n=== Backfilling alerts ===");
            await backfillCollection('alerts', 'createdAt', 'createdBy');

            console.log("\n=== Backfilling dashboards ===");
            await backfillCollection('dashboards', 'created_at', 'owner_id');

            console.log("\n=== Backfilling widgets ===");
            await backfillCollection('widgets', null, null);

            console.log("\n=== Audit fields backfill completed ===");
            if (countlyDb && countlyDb.close) {
                countlyDb.close();
            }
            if (outDb && outDb.close) {
                outDb.close();
            }
        }
        catch (error) {
            console.error("Error during backfill:", error);
            if (countlyDb && countlyDb.close) {
                countlyDb.close();
            }
            if (outDb && outDb.close) {
                outDb.close();
            }
            process.exit(1);
        }
    }

    await run();
})();

