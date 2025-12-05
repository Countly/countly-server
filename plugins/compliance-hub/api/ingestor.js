var plugin = {},
    common = require('../../../api/utils/common.js'),
    log = common.log('compliance-hub:ingestor'),
    plugins = require('../../pluginManager.js');

const FEATURE_NAME = 'compliance_hub';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.internalDrillEvents.push("[CLY]_consent");

    //write api call
    plugins.register("/sdk/process_user", function(ob) {
        var params = ob.params;
        if (typeof params.qstring.consent === "string") {
            try {
                params.qstring.consent = JSON.parse(params.qstring.consent);
            }
            catch (SyntaxError) {
                log.e('Parse consent JSON failed', params.qstring.consent, params.req.url, params.req.body);
            }
        }
        if (params.qstring.consent) {
            if (!params.app_user.consent) {
                params.app_user.consent = {};
            }

            var update = {};
            var changes = {};
            var finalState = JSON.parse(JSON.stringify(params.app_user.consent));
            var metrics = {
                i: {segments: {feature: []}, value: 1, hourlySegments: ["feature"]},
                o: {segments: {feature: []}, value: 1, hourlySegments: ["feature"]}
            };
            for (var i in params.qstring.consent) {
                finalState[i] = params.qstring.consent[i];
                if (params.app_user.consent[i] !== params.qstring.consent[i]) {
                    update["consent." + i] = params.qstring.consent[i];
                    changes[i] = params.qstring.consent[i];
                    if (params.qstring.consent[i]) {
                        metrics.i.segments.feature.push(i);
                    }
                    else {
                        metrics.o.segments.feature.push(i);
                    }
                }
            }

            if (Object.keys(update).length) {
                var type = [];
                ob.updates.push({$set: update});

                var stateSegmentation = {};
                Object.keys(finalState).forEach(function(k) {
                    stateSegmentation[k] = String(finalState[k]);
                });
                if (metrics.i.segments.feature.length) {
                    type.push("i");
                }
                if (metrics.o.segments.feature.length) {
                    type.push("o");
                }
                if (type.length === 1) {
                    stateSegmentation._type = type[0];
                }
                else if (type.length > 1) {
                    stateSegmentation._type = type;
                }
                if (Object.keys(changes).length) {
                    stateSegmentation._change = changes; //JSON.stringify(changes);
                }
                if (!metrics.i.segments.feature.length) {
                    delete metrics.i;
                }
                if (!metrics.o.segments.feature.length) {
                    delete metrics.o;
                }
                if (Object.keys(metrics).length) {
                    common.recordMetric(params, {
                        collection: "consents",
                        id: params.app_id,
                        metrics: metrics
                    });
                }
                params.qstring.events.push({
                    key: "[CLY]_consent",
                    count: 1,
                    segmentation: stateSegmentation
                });
            }
        }
    });

    plugins.register("/i/user_merge", function(ob) {
        var newAppUser = ob.newAppUser;
        var oldAppUser = ob.oldAppUser;
        if (typeof oldAppUser.consent !== "undefined") {
            if (typeof newAppUser.consent === "undefined") {
                newAppUser.consent = oldAppUser.consent;
            }
            else {
                for (var i in oldAppUser.consent) {
                    if (typeof newAppUser.consent[i] === "undefined") {
                        newAppUser.consent[i] = oldAppUser.consent[i];
                    }
                }
            }
        }
    });

}(plugin));

module.exports = plugin;
