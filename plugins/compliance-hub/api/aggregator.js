var plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
const log = require('../../../api/utils/log.js')('compliance-hub:aggregator');
const utils = require('./utils/compliance-hub.utils');

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
            await eventSource.processWithAutoAck(async(token, events) => {
                if (!events || !Array.isArray(events)) {
                    return;
                }

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
            });
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

        const change = utils.computeChange(currEvent.sg);
        const inFeatures = [];
        const outFeatures = [];

        Object.keys(change).forEach((k) => {
            if (change[k] === true) {
                inFeatures.push(k);
            }
            else if (change[k] === false) {
                outFeatures.push(k);
            }
        });

        const metrics = {};
        if (inFeatures.length) {
            metrics.i = {segments: {feature: inFeatures}, value: 1, hourlySegments: ["feature"]};
        }
        if (outFeatures.length) {
            metrics.o = {segments: {feature: outFeatures}, value: 1, hourlySegments: ["feature"]};
        }

        return Object.keys(metrics).length ? metrics : null;
    }

}());
