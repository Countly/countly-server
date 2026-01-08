var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');

const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
var log = common.log('hooks:aggregator');
const IncomingDataTrigger = require('./parts/triggers/incoming_data.js');
const utils = require('./utils.js');
const {HTTPEffect, EmailEffect, CustomCodeEffect} = require('./parts/effects/index.js');

(function() {

    plugins.register("/aggregator", async function() {

        log.d("Starting hooks aggregator initialization");

        // Initialize global request counter for rate limiting
        if (!global.triggerRequestCount) {
            global.triggerRequestCount = [];
        }

        /**
         * Process effects based on rule configuration
         * @param {Object} data - Pipeline data with params and rule
         */
        const processEffects = async(data) => {
            try {
                const {rule} = data;

                if (!rule || !rule.effects || !Array.isArray(rule.effects)) {
                    log.d("No effects to process for rule:", rule?._id);
                    return;
                }

                // Add rate limiter check
                if (utils.checkRateLimitReached(rule)) {
                    log.e("[call limit reached]", `call limit reached for ${rule._id}`);
                    utils.addErrorRecord(rule._id, `call limit reached for ${rule._id}`);
                    return;
                }

                log.d("Processing effects for rule:", rule._id, "Effects count:", rule.effects.length);

                for (const effectConfig of rule.effects) {
                    try {
                        let effect;

                        switch (effectConfig.type) {
                        case 'HTTPEffect':
                            effect = new HTTPEffect(effectConfig);
                            break;
                        case 'EmailEffect':
                            effect = new EmailEffect(effectConfig);
                            break;
                        case 'CustomCodeEffect':
                            effect = new CustomCodeEffect(effectConfig);
                            break;
                        default:
                            log.w("Unknown effect type:", effectConfig.type);
                            continue;
                        }

                        if (effect && typeof effect.process === 'function') {
                            await effect.process(data);
                            log.d("Effect processed successfully:", effectConfig.type);
                        }
                    }
                    catch (effectErr) {
                        log.e("Error processing individual effect:", effectErr, effectErr.stack);
                        // Add error logging to rule document
                        utils.addErrorRecord(rule._id, effectErr.message || effectErr.toString());
                    }
                }
            }
            catch (err) {
                log.e("Error in processEffects:", err, err.stack);
                if (data.rule && data.rule._id) {
                    utils.addErrorRecord(data.rule._id, err.message || err.toString());
                }
            }
        };
        // Initialize the IncomingDataTrigger with pipeline callback
        const incomingDataTrigger = new IncomingDataTrigger({
            pipeline: async(data) => {
                try {
                    log.d("Processing pipeline for rule:", data.rule._id);

                    // Update rule trigger time
                    utils.updateRuleTriggerTime(data.rule._id);

                    // Process effects
                    await processEffects(data);
                }
                catch (err) {
                    log.e("Error processing hook pipeline:", err, err.stack);
                    if (data.rule && data.rule._id) {
                        utils.addErrorRecord(data.rule._id, err.message || err.toString());
                    }
                }
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
                log.d("Synced rules:", rules.length);
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

            // eslint-disable-next-line no-unused-vars
            await eventSource.processWithAutoAck(async(token, events) => {
                log.d("hooks Aggregator got events:", events.length);

                // Process events through IncomingDataTrigger
                await incomingDataTrigger.processFromAggregator(events);
            });
        }
        catch (err) {
            log.e("Could not start hooks event source", err, err.stack);
        }
    });

})();