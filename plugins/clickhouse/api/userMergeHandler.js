const log = require('../../../api/utils/log.js')('clickhouse:merge');
const countlyConfig = require('../../../api/config');
const ClusterManager = require('./managers/ClusterManager');
const QueryHelpers = require('./QueryHelpers');
const Identity = require('./users/Identity');

/**
 * Get root anchor for a given uid within an app context
 * @param {ClickHouseClient} client - ClickHouse client instance
 * @param {string} appId - Application ID
 * @param {string} uid - User ID to resolve
 * @returns {Promise<string>} Resolved root anchor
 * @description
 * Queries uid_map for the latest canon for the given uid within the specified app
 * If no mapping exists, returns the uid itself as its own anchor
 */
async function getRoot(client, appId, uid) {
    const rootSql = `
        SELECT nullIf(canon,'') AS canon
        FROM ${QueryHelpers.resolveTable('uid_map')}
        WHERE a = {appId:String}
          AND uid = {uid:String}
        ORDER BY change_ts DESC, updated_at DESC
        LIMIT 1
    `;
    const res = await client.query({ query: rootSql, query_params: { appId, uid }, format: 'JSONEachRow' });
    const rows = await res.json();
    return rows[0]?.canon || uid;
}

/**
 * Find winner anchor for merging two uids within an app context
 * @param {ClickHouseClient} client - ClickHouse client instance
 * @param {string} appId - Application ID
 * @param {String} uid1 - Old User ID
 * @param {String} uid2 - New User ID
 * @returns {Promise<Object>} Merge info with fromAnchor, toAnchor, winner, alreadyUnified
 * @description
 * Resolve both roots (anchors) via getRoot() within the specified app
 * Prefer an anchor that already exists in uid_map (stability)
 * If both exist, prefer uid1's anchor (deterministic tie-break)
 */
async function findWinnerAnchor(client, appId, uid1, uid2) {
    const [root1, root2] = await Promise.all([
        getRoot(client, appId, uid2),
        getRoot(client, appId, uid1)
    ]);

    if (root1 === root2) { // Quick exit: if both roots are identical, we're already unified
        return { fromAnchor: root1, toAnchor: root2, winner: root1, alreadyUnified: true };
    }

    const existsSql = `
        SELECT 1
        FROM ${QueryHelpers.resolveTable('uid_map')}
        WHERE a = {appId:String}
          AND uid = {uid:String}
        ORDER BY change_ts DESC, updated_at DESC
        LIMIT 1
    `; // Existence check SQL: do we have any row for this anchor uid in this app?

    // Check if each anchor is already present (stabilizes winner choice)
    const [e1, e2] = await Promise.all([
        client.query({ query: existsSql, query_params: { appId, uid: root1 }, format: 'JSONEachRow' }),
        client.query({ query: existsSql, query_params: { appId, uid: root2 }, format: 'JSONEachRow' })
    ]);
    const root1Exists = (await e1.json()).length > 0;
    const root2Exists = (await e2.json()).length > 0;

    // Winner logic:
    // - If root1 exists → choose root1
    // - Else if root2 exists → choose root2
    // - Else neither exists → choose root1 (uid1's root) for determinism
    const winner = root1Exists ? root1 : (root2Exists ? root2 : root1);

    return { fromAnchor: root1, toAnchor: root2, winner, alreadyUnified: false };
}

/**
 * Handle user merge event - writes merge data to ClickHouse uid_map table
 * @param {Object} ob - Event object containing app_id, oldAppUser, newAppUser, mergeOptions
 * @param {ClickHouseClient} clickhouseClient - ClickHouse client instance
 * @returns {Promise<void>} resolves when merge handling is complete
 */
async function handleUserMerge(ob, clickhouseClient) {
    const appId = ob.app_id;
    const oldUid = ob.oldAppUser?.uid;
    const newUid = ob.newAppUser?.uid;
    const mergeOptions = ob.mergeOptions;

    log.d('handleUserMerge called:', { appId, oldUid, newUid, hasClient: !!clickhouseClient });

    // Validation - reject if app_id is missing
    if (!appId || !oldUid || !newUid || !clickhouseClient || oldUid === newUid) {
        if (!appId) {
            log.e('Merge rejected - missing app_id', { appId, oldUid, newUid });
        }
        log.d('Merge validation failed:', { appId: !!appId, oldUid: !!oldUid, newUid: !!newUid, hasClient: !!clickhouseClient, sameUid: oldUid === newUid });
        return;
    }
    log.d('Merge (flatten-to-anchor) start:', { appId, oldUid, newUid });

    const identity = new Identity(clickhouseClient);

    try {
        // 1) Resolve anchors and pick a winner (WITH app_id)
        let fromAnchor, toAnchor, winner, alreadyUnified;
        if (mergeOptions && mergeOptions.fromAnchor && mergeOptions.toAnchor && mergeOptions.winner) {
            // Use provided merge options
            log.d('Step 1a: Using provided mergeOptions');
            ({ fromAnchor, toAnchor, winner, alreadyUnified } = mergeOptions);
            log.d('Step 1a: Extracted:', { fromAnchor, toAnchor, winner, alreadyUnified });
        }
        else {
            // Fallback: resolve anchors ourselves if mergeOptions not provided
            log.d('Step 1b: Calling findWinnerAnchor...');
            const anchorResult = await findWinnerAnchor(clickhouseClient, appId, oldUid, newUid);
            log.d('Step 1b: findWinnerAnchor returned:', anchorResult);
            fromAnchor = anchorResult.fromAnchor;
            toAnchor = anchorResult.toAnchor;
            winner = anchorResult.winner;
            alreadyUnified = anchorResult.alreadyUnified;
        }

        log.d('Step 2: Validating anchors:', { fromAnchor, toAnchor, winner, alreadyUnified });
        if (!fromAnchor || !toAnchor || !winner) {
            //Better do not do merge at all than record bad data.
            throw new Error('ClickHouse: Merge rejected - invalid merge options' + JSON.stringify({ appId, oldUid, newUid, mergeOptions }));
        }
        // If already unified, ensure self-row exists
        if (alreadyUnified) {
            const existsSql = `
                SELECT 1
                FROM ${QueryHelpers.resolveTable('uid_map')}
                WHERE a = {appId:String}
                  AND uid = {uid:String}
                ORDER BY change_ts DESC, updated_at DESC
                LIMIT 1
            `;

            const maybeSelf = await clickhouseClient.query({
                query: existsSql,
                query_params: { appId, uid: winner },
                format: 'JSONEachRow'
            });

            if ((await maybeSelf.json()).length === 0) {
                const now = Date.now(); // DateTime64(3) expects milliseconds
                const cm = new ClusterManager(countlyConfig.clickhouse || {});
                const insertTable = cm.getFullInsertTable('identity', 'uid_map');
                await clickhouseClient.insert({
                    table: insertTable,
                    values: [{
                        a: appId,
                        uid: winner,
                        canon: winner,
                        change_ts: now,
                        updated_at: now
                    }],
                    format: 'JSONEachRow'
                });
                // Reload dictionary after inserting self-row
                try {
                    await identity.reloadDictionary();
                }
                catch (reloadErr) {
                    log.w('Dictionary reload warning (self-row):', reloadErr.message);
                }
            }
            log.i('ClickHouse: Merge no-op (already same anchor)', {
                appId, oldUid, newUid, anchor: winner
            });
            return;
        }

        // 2) Grab the current aliases that map to either anchor (APP-SCOPED)
        log.d('Step 3: Querying aliases...');
        const aliasesSql = `
            SELECT uid
            FROM (
              SELECT uid, canon
              FROM ${QueryHelpers.resolveTable('uid_map')}
              WHERE a = {appId:String}
              ORDER BY uid, change_ts DESC, updated_at DESC
              LIMIT 1 BY uid
            )
            WHERE canon IN ({anchors:Array(String)})
        `;

        log.d('Step 3: SQL query:', aliasesSql);
        const aRes = await clickhouseClient.query({
            query: aliasesSql,
            query_params: { appId, anchors: [fromAnchor, toAnchor] },
            format: 'JSONEachRow'
        });
        log.d('Step 3: Query executed, reading JSON...');
        const aliasRows = await aRes.json();
        log.d('Step 3: Aliases found:', aliasRows.length);

        // 3) Build the set of uids to flatten
        log.d('Step 4: Building aliasSet...');
        const aliasSet = new Set(aliasRows.map(r => r.uid));
        aliasSet.add(oldUid);
        aliasSet.add(newUid);
        aliasSet.add(fromAnchor);
        aliasSet.add(toAnchor);
        log.d('Step 4: aliasSet size:', aliasSet.size);

        // 4) Append-only batch: winner->winner + every alias -> winner
        const now = Date.now(); // DateTime64(3) expects milliseconds
        const batch = [{
            a: appId,
            uid: winner,
            canon: winner,
            change_ts: now,
            updated_at: now
        }];

        for (const uid of aliasSet) {
            if (uid === winner) {
                continue;
            }
            batch.push({
                a: appId,
                uid,
                canon: winner,
                change_ts: now,
                updated_at: now
            });
        }

        log.d('Step 5: Getting insert table...');
        const cm = new ClusterManager(countlyConfig.clickhouse || {});
        const insertTable = cm.getFullInsertTable('identity', 'uid_map');
        log.d('Step 5: Insert table:', insertTable, 'Batch size:', batch.length);

        log.d('Step 6: Inserting to ClickHouse...');
        await clickhouseClient.insert({
            table: insertTable,
            values: batch,
            format: 'JSONEachRow'
        });
        log.d('Step 6: Insert complete!');

        // Reload the identity dictionary to ensure merged UIDs are immediately visible in queries
        log.d('Step 7: Reloading dictionary...');
        try {
            await identity.reloadDictionary();
            log.d('Step 7: Dictionary reloaded successfully');
        }
        catch (reloadErr) {
            // Non-fatal: dictionary will auto-refresh based on lifetime settings
            log.w('Dictionary reload warning:', reloadErr.message);
        }

        log.d('Step 8: MERGE COMPLETE!');
        log.i('ClickHouse: Merge flattened to anchor', {
            appId, oldUid, newUid, fromAnchor, toAnchor, winner, aliasesWritten: batch.length
        });
    }
    catch (err) {
        log.e('Merge error', err);
    }
}

module.exports = {
    getRoot,
    findWinnerAnchor,
    handleUserMerge
};
