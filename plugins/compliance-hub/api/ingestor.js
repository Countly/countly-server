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
            var after = JSON.parse(JSON.stringify(params.app_user.consent));
            var metrics = {i: false, o: false};
            for (var i in params.qstring.consent) {
                //check if we already dont have that setting
                after[i] = params.qstring.consent[i];
                if (params.app_user.consent[i] !== params.qstring.consent[i]) {
                    //record only changes
                    update["consent." + i] = params.qstring.consent[i];
                    changes[i] = params.qstring.consent[i];
                    if (params.qstring.consent[i]) {
                        metrics.i = true;
                    }
                    else {
                        metrics.o = true;
                    }
                }
            }

            if (Object.keys(update).length) {
                var type = [];
                if (metrics.i) {
                    type.push("i");
                }
                if (metrics.o) {
                    type.push("o");
                }
                if (type.length === 1) {
                    type = type[0];
                }
                ob.updates.push({$set: update});
                changes._type = type;

                params.qstring.events.push({
                    key: "[CLY]_consent",
                    count: 1,
                    segmentation: changes,
                    bf: JSON.parse(JSON.stringify(params.app_user.consent))
                });
            }
        }
    });

    plugins.register("/i/user_merge", function(ob) {
        console.log("compliance hub user merge called", ob.newAppUser, ob.oldAppUser);
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
