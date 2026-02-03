const plugins = require('../../pluginManager.ts');
const log = require('../../../api/utils/log.js')('clickhouse:ingestor');
const {initializeClickHouse, getClient} = require('./api.js');
const ID = require("./users/Identity");
const { findWinnerAnchor, handleUserMerge } = require('./userMergeHandler');

(async() => {
    try {
        await initializeClickHouse();
    }
    catch (err) {
        log.e('ClickHouse ingestor: initializeClickHouse failed', err);
        return;
    }

    const clickhouseClient = getClient();

    if (!clickhouseClient) {
        log.w('ClickHouse client not available, skipping device ID listener initialization');
        return;
    }

    const identity = new ID(clickhouseClient);
    try {
        await identity.bootstrap();
    }
    catch (err) {
        log.e('ClickHouse ingestor: identity.bootstrap failed', err);
        return;
    }

    plugins.register("/i/suggest_merged_uid", async function(ob) {
        const appId = ob.app_id;
        const oldUid = ob.oldAppUser?.uid;
        const newUid = ob.newAppUser?.uid;

        // Validation - reject if app_id is missing
        if (!appId || !oldUid || !newUid || !clickhouseClient || oldUid === newUid) {
            if (!appId) {
                log.e('ClickHouse: Suggest merge rejected - missing app_id', { appId, oldUid, newUid });
            }
            ob.results.push({"error": "invalid_data"});
            return;
        }
        try {
            const { fromAnchor, toAnchor, winner, alreadyUnified } = await findWinnerAnchor(clickhouseClient, appId, oldUid, newUid);
            ob.results.push({winner: winner, fromAnchor: fromAnchor, toAnchor: toAnchor, "alreadyUnified": alreadyUnified});
            return;
        }
        catch (err) {
            log.e(err);
            ob.results.push({"error": "server_error"});
            return;
        }

    });

    plugins.register("/i/user_merge", async function(ob) {
        await handleUserMerge(ob, clickhouseClient);
    });
})();
