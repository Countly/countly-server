var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
const log = require('../../../api/utils/log.js')('compliance-hub:aggregator');

(function() {
    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('compliance-hub-consents', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": "[CLY]_consent"}},
                    {
                        "$project": {
                            "__id": "$fullDocument._id",
                            "cd": "$fullDocument.cd",
                            "a": "$fullDocument.a",
                            "e": "$fullDocument.e",
                            "ts": "$fullDocument.ts",
                            "sg": "$fullDocument.sg",
                            "did": "$fullDocument.did",
                            "uid": "$fullDocument.uid",
                            "_uid": "$fullDocument._uid"
                        }
                    }
                ],
                fallback: {
                    pipeline: [
                        {"$match": {"e": "[CLY]_consent"}},
                        {
                            "$project": {
                                "__id": "$_id",
                                "cd": "$cd",
                                "a": "$a",
                                "e": "$e",
                                "ts": "$ts",
                                "sg": "$sg",
                                "did": "$did",
                                "uid": "$uid",
                                "_uid": "$_uid"
                            }
                        }
                    ]
                }
            }
        });

        try {
            for await (const {events} of eventSource) {
                if (events && Array.isArray(events)) {
                    for (let i = 0; i < events.length; i++) {
                        const currEvent = events[i];
                        if (!currEvent || currEvent.e !== "[CLY]_consent" || !currEvent.a) {
                            continue;
                        }

                        const metrics = buildConsentMetrics(currEvent);
                        if (metrics) {
                            const consentParams = {
                                app_id: currEvent.a,
                                appTimezone: null,
                                time: common.initTimeObj(null, currEvent.ts),
                                qstring: {
                                    app_id: currEvent.a,
                                    device_id: currEvent.did
                                }
                            };
                            common.recordMetric(consentParams, {
                                collection: "consents",
                                id: currEvent.a,
                                metrics: metrics
                            });
                        }
                    }
                }
            }
        }
        catch (err) {
            log.e('Consent aggregation error:', err);
        }
    });

    /**
    * Build consent metric payload for recordMetric
    * @param {object} currEvent - drill event document
    * @returns {object|null} metrics definition
    */
    function buildConsentMetrics(currEvent) {
        if (!currEvent.sg) {
            return null;
        }

        const inFeatures = [];
        const outFeatures = [];

        if (currEvent.sg._change) {
            let changeObj = currEvent.sg._change;
            Object.keys(changeObj).forEach(function(key) {
                if (key.startsWith("_")) {
                    return;
                }
                const val = normalizeBool(changeObj[key]);
                if (val === true) {
                    inFeatures.push(key);
                }
                else if (val === false) {
                    outFeatures.push(key);
                }
            });
        }

        const metrics = {};
        if (inFeatures.length) {
            metrics.i = {segments: {feature: inFeatures}, value: 1, hourlySegments: ["feature"]};
        }
        if (outFeatures.length) {
            metrics.o = {segments: {feature: outFeatures}, value: 1, hourlySegments: ["feature"]};
        }

        return Object.keys(metrics).length ? metrics : null;
    }

    /**
     * Normalizes various boolean representations to true/false
     * @param {any} v - value to normalize
     * @returns {boolean|undefined} normalized boolean.
     */
    function normalizeBool(v) {
        if (v === true || v === false) {
            return v;
        }
        if (v === "true") {
            return true;
        }
        if (v === "false") {
            return false;
        }
        return undefined;
    }
}());
