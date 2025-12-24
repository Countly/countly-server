/*
This script rolls back audit fields (created_at, created_by, updated_at, updated_by)
that were added by backfill_audit_fields.js.

It is intentionally conservative:
 - It only UNSETS the standardized audit fields.
 - It NEVER touches legacy fields such as created, creator, createdBy, edited_at, etc.

You can safely run it once if you decide to revert the audit metadata rollout on existing data.
*/

// Use the top-level Countly pluginManager so config.js is resolved correctly
// Script path: core/bin/upgrade/DEV/rollback_audit_fields.js
// Root plugins path: ../../../../plugins/pluginManager.js
var pluginManager = require('../../../../plugins/pluginManager.js');

const OPERATION_BATCH_SIZE = 200;

console.log("Starting audit fields ROLLBACK...");

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

    let apps = [];
    try {
        apps = await countlyDb.collection('apps').find({}, {projection: {_id: 1}}).toArray();
        console.log(`Loaded ${apps.length} apps for per-app collections`);
    }
    catch (error) {
        console.error("Unable to load apps list, per-app collections will be skipped:", error);
    }

    /**
     * Rollback audit fields for a collection by unsetting created_at/created_by/updated_at/updated_by.
     * Legacy fields are left intact.
     * @param {string} collectionName - Collection name
     * @param {boolean} useOutDb - Whether to use outDb instead of db
     */
    async function rollbackCollection(collectionName, useOutDb = false) {
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
                        { created_at: { $exists: true } },
                        { created_by: { $exists: true } },
                        { updated_at: { $exists: true } },
                        { updated_by: { $exists: true } }
                    ]
                });

                cursor.forEach(function(doc) {
                    processed++;
                    const unset = {};
                    let needsUpdate = false;

                    if (typeof doc.created_at !== "undefined") {
                        unset.created_at = "";
                        needsUpdate = true;
                    }
                    if (typeof doc.created_by !== "undefined") {
                        unset.created_by = "";
                        needsUpdate = true;
                    }
                    if (typeof doc.updated_at !== "undefined") {
                        unset.updated_at = "";
                        needsUpdate = true;
                    }
                    if (typeof doc.updated_by !== "undefined") {
                        unset.updated_by = "";
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        requests.push({
                            updateOne: {
                                filter: { _id: doc._id },
                                update: { $unset: unset }
                            }
                        });
                        updated++;
                    }

                    if (requests.length >= OPERATION_BATCH_SIZE) {
                        db.collection(collectionName).bulkWrite(requests, { ordered: false })
                            .then(() => {
                                console.log(`  Processed ${processed} documents, rolled back ${updated} in ${collectionName}`);
                                requests = [];
                            })
                            .catch(ex => {
                                console.error(`Error rolling back ${collectionName}:`, ex);
                            });
                    }
                }, function() {
                    if (requests.length > 0) {
                        db.collection(collectionName).bulkWrite(requests, { ordered: false })
                            .catch(ex => {
                                console.error(`Error rolling back ${collectionName}:`, ex);
                            })
                            .finally(() => {
                                console.log(`SUCCESS: Rolled back ${updated} documents in ${collectionName} (processed ${processed} total)`);
                                resolve();
                            });
                    }
                    else {
                        console.log(`SUCCESS: Rolled back ${updated} documents in ${collectionName} (processed ${processed} total)`);
                        resolve();
                    }
                });
            }
            catch (e) {
                console.error(`Error while rolling back ${collectionName}:`, e);
                reject(`Error while rolling back ${collectionName}, ${e}`);
            }
        });
    }

    async function rollbackPerAppCollections(collectionPrefix, useOutDb = false) {
        if (!apps.length) {
            console.log(`Skipping ${collectionPrefix}* collections - no apps available`);
            return;
        }
        for (const app of apps) {
            const appId = app._id.toString();
            const collectionName = collectionPrefix + appId;
            await rollbackCollection(collectionName, useOutDb);
        }
    }

    async function run() {
        try {
            console.log("\n=== Rolling back members ===");
            await rollbackCollection('members');

            console.log("\n=== Rolling back drill bookmarks ===");
            await rollbackCollection('drill_bookmarks', true);

            console.log("\n=== Rolling back _dwProcess ===");
            await rollbackCollection('_dwProcess', true);

            console.log("\n=== Rolling back concurrent user alerts ===");
            await rollbackCollection('concurrent_users_alerts');

            console.log("\n=== Rolling back content blocks ===");
            await rollbackCollection('content_blocks');

            console.log("\n=== Rolling back content queue ===");
            await rollbackCollection('content_queue');

            console.log("\n=== Rolling back groups ===");
            await rollbackCollection('groups');

            console.log("\n=== Rolling back cohorts ===");
            await rollbackCollection('cohorts');

            console.log("\n=== Rolling back profile group imports ===");
            await rollbackCollection('profile_groups_imports');

            console.log("\n=== Rolling back data manager transforms ===");
            await rollbackCollection('datamanager_transforms');

            console.log("\n=== Rolling back calculated metrics ===");
            await rollbackCollection('calculated_metrics');

            console.log("\n=== Rolling back crash symbols (per-app) ===");
            await rollbackPerAppCollections('app_crashsymbols');

            console.log("\n=== Rolling back geo fences ===");
            await rollbackCollection('geos');

            console.log("\n=== Rolling back journey definitions ===");
            await rollbackCollection('journey_definition');

            console.log("\n=== Rolling back journey versions ===");
            await rollbackCollection('journey_versions');

            console.log("\n=== Rolling back funnels ===");
            await rollbackCollection('funnels');

            console.log("\n=== Rolling back AB testing experiments (per-app) ===");
            await rollbackPerAppCollections('ab_testing_experiments', true);

            console.log("\n=== Rolling back flows ===");
            await rollbackCollection('flow_schemas');

            console.log("\n=== Rolling back feedback widgets ===");
            await rollbackCollection('feedback_widgets');

            console.log("\n=== Rolling back blocked users (per-app) ===");
            await rollbackPerAppCollections('blocked_users');

            console.log("\n=== Rolling back hooks ===");
            await rollbackCollection('hooks');

            console.log("\n=== Rolling back alerts ===");
            await rollbackCollection('alerts');

            console.log("\n=== Rolling back dashboards ===");
            await rollbackCollection('dashboards');

            console.log("\n=== Rolling back widgets ===");
            await rollbackCollection('widgets');

            console.log("\n=== Audit fields rollback completed ===");
            if (countlyDb && countlyDb.close) {
                countlyDb.close();
            }
            if (outDb && outDb.close) {
                outDb.close();
            }
        }
        catch (error) {
            console.error("Error during rollback:", error);
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


