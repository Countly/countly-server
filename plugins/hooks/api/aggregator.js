var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');

const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
var log = common.log('hooks:aggregator');
const IncomingDataTrigger = require('./parts/triggers/incoming_data.js');

(function() {

    plugins.register("/aggregator", async function() {

        // Initialize the IncomingDataTrigger with pipeline callback
        const incomingDataTrigger = new IncomingDataTrigger({
            pipeline: (data) => {
                // This will be called when events match rules
                // Send to the main Hooks processing queue
                plugins.dispatch("/hooks/trigger", data);
            }
        });

        /**
         * Sync rules periodically from the database
         * @returns {Promise<void>} Promise that resolves when sync is complete
         */
        const syncRules = async() => {
            try {
                const rules = await common.db.collection("hooks")
                    .find({"enabled": true, "trigger.type": "IncomingDataTrigger"}, {error_logs: 0})
                    .toArray();
                incomingDataTrigger.syncRules(rules);
            }
            catch (err) {
                log.e("Error syncing rules:", err);
            }
        };

        // Initial sync
        await syncRules();

        // Sync every 3 seconds (matching the config in api.js)
        setInterval(syncRules, 3000);

        const eventSource = new UnifiedEventSource('hooks-process', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert"}}
                ],
                fallback: {
                    pipeline: []
                }
            }
        });

        try {
            log.d("hooks Aggregator started");

            for await (const { events } of eventSource) {
                log.d("hooks Aggregator got events:", events.length);

                // Process events through IncomingDataTrigger
                await incomingDataTrigger.processFromAggregator(events);
            }
        }
        catch (err) {
            log.e("Could not start hooks event source", err);
        }
    });

})();